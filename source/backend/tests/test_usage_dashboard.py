from datetime import datetime, timedelta
from time import perf_counter
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api.chat import _complete
from api.usage import get_dashboard
from models.database import Base
from models.tool import Tool, ToolTemplate
from models.usage import UsageLog
from models.user import User


def make_database():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[User.__table__, ToolTemplate.__table__, Tool.__table__, UsageLog.__table__],
    )
    return sessionmaker(bind=engine)()


def add_log(db, *, user_id, tool_id, status, created_at):
    db.add(
        UsageLog(
            user_id=user_id,
            tool_id=tool_id,
            input_text="测试问题",
            output_text="测试回答",
            session_id=f"session-{user_id}-{tool_id}-{status}-{created_at.timestamp()}",
            status=status,
            created_at=created_at,
        )
    )


def test_chat_completion_keeps_student_and_teacher_statuses_separate():
    class Recorder:
        def add_all(self, rows):
            self.rows = rows

        def commit(self):
            pass

    db = Recorder()
    tool = SimpleNamespace(id=101, usage_count=0)
    session = SimpleNamespace(id="session-101", last_activity_at=None)
    student = User(id=11, username="student", password_hash="hash", role="student")
    teacher = User(id=1, username="teacher", password_hash="hash", role="teacher")

    _complete(db, student, session, tool, "学生问题", "学生回答", perf_counter(), "student_use")
    student_log = next(row for row in db.rows if isinstance(row, UsageLog))
    _complete(db, teacher, session, tool, "教师问题", "教师回答", perf_counter(), "teacher_preview")
    teacher_log = next(row for row in db.rows if isinstance(row, UsageLog))

    assert student_log.status == "completed"
    assert teacher_log.status == "preview"
    assert tool.usage_count == 1


def test_dashboard_separates_teacher_previews_from_student_usage_and_private_tools():
    db = make_database()
    now = datetime.utcnow()
    teacher = User(id=1, username="teacher-one", password_hash="hash", role="teacher", name="一号教师")
    other_teacher = User(id=2, username="teacher-two", password_hash="hash", role="teacher", name="二号教师")
    student_one = User(id=11, username="student-one", password_hash="hash", role="student", name="一号学生")
    student_two = User(id=12, username="student-two", password_hash="hash", role="student", name="二号学生")
    own_tool = Tool(id=101, name="自己的工具", category="文科", prompt_template="prompt", creator_id=teacher.id, plaza_status="published")
    other_tool = Tool(id=102, name="其他教师工具", category="理科", prompt_template="prompt", creator_id=other_teacher.id, plaza_status="unlisted")
    preset_tool = Tool(id=103, name="系统预设工具", category="通用", prompt_template="prompt", is_preset=True, plaza_status="published")
    db.add_all([teacher, other_teacher, student_one, student_two, own_tool, other_tool, preset_tool])
    db.commit()

    add_log(db, user_id=student_one.id, tool_id=own_tool.id, status="completed", created_at=now - timedelta(hours=1))
    add_log(db, user_id=student_two.id, tool_id=own_tool.id, status="completed", created_at=now - timedelta(days=2))
    add_log(db, user_id=teacher.id, tool_id=own_tool.id, status="preview", created_at=now - timedelta(minutes=20))
    add_log(db, user_id=teacher.id, tool_id=own_tool.id, status="preview", created_at=now - timedelta(days=2, hours=1))
    add_log(db, user_id=teacher.id, tool_id=own_tool.id, status="aborted", created_at=now - timedelta(minutes=10))
    add_log(db, user_id=student_one.id, tool_id=other_tool.id, status="completed", created_at=now - timedelta(hours=1))
    add_log(db, user_id=other_teacher.id, tool_id=other_tool.id, status="preview", created_at=now - timedelta(hours=1))
    add_log(db, user_id=student_one.id, tool_id=preset_tool.id, status="completed", created_at=now - timedelta(hours=1))
    add_log(db, user_id=teacher.id, tool_id=preset_tool.id, status="preview", created_at=now - timedelta(hours=1))
    db.commit()

    try:
        data = get_dashboard(days=7, tool_id=None, db=db, current_user=teacher)

        assert data["total_usage"] == 2
        assert data["active_students"] == 2
        assert data["distinct_students"] == 2
        assert sum(item["count"] for item in data["weekly_trend"]) == 2
        assert data["preview_count"] == 2
        assert {item["status"] for item in data["recent_logs"]} == {"completed", "preview"}
        assert {item["tool_id"] for item in data["recent_logs"]} == {own_tool.id}
        assert data["top_tools"] == [{"id": own_tool.id, "name": own_tool.name, "count": 2, "percentage": 100.0}]

        with pytest.raises(HTTPException) as error:
            get_dashboard(days=7, tool_id=other_tool.id, db=db, current_user=teacher)
        assert error.value.status_code == 403
    finally:
        db.close()
