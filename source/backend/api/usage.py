import csv
import io
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from api.dependencies import get_current_user, require_roles
from models.database import get_db
from models.tool import Tool
from models.usage import UsageLog
from models.user import User

router = APIRouter()

def _date_range(days: int):
    if days not in (7, 30): raise HTTPException(status_code=422, detail="days 仅支持 7 或 30")
    return datetime.utcnow() - timedelta(days=days-1)

def _ids(db, user, tool_id):
    query = db.query(Tool.id) if user.role == "admin" else db.query(Tool.id).filter(Tool.creator_id == user.id)
    ids = [row[0] for row in query.all()]
    if tool_id is not None:
        if tool_id not in ids: raise HTTPException(status_code=403, detail="无权查看该工具数据")
        ids = [tool_id]
    return ids

def _dashboard(db, user, days, tool_id):
    since = _date_range(days); ids = _ids(db, user, tool_id); base = db.query(UsageLog).filter(UsageLog.tool_id.in_(ids or [-1]), UsageLog.status == "completed", UsageLog.created_at >= since)
    preview_base = db.query(UsageLog).filter(UsageLog.tool_id.in_(ids or [-1]), UsageLog.status == "preview", UsageLog.created_at >= since)
    total = base.count(); preview_total = preview_base.count()
    distinct_students = base.join(User, User.id == UsageLog.user_id).filter(User.role == "student").with_entities(UsageLog.user_id).distinct().count()
    trend = []
    for offset in range(days - 1, -1, -1):
        start = (datetime.utcnow() - timedelta(days=offset)).date()
        count = base.filter(func.date(UsageLog.created_at) == start).count()
        trend.append({"date": start.isoformat(), "count": count})
    ranking = db.query(Tool.id, Tool.name, func.count(UsageLog.id).label("count")).outerjoin(UsageLog, (UsageLog.tool_id == Tool.id) & (UsageLog.status == "completed") & (UsageLog.created_at >= since)).filter(Tool.id.in_(ids or [-1])).group_by(Tool.id, Tool.name).order_by(func.count(UsageLog.id).desc()).limit(10).all()
    recent_rows = (
        db.query(UsageLog, User.name, User.username, Tool.name)
        .outerjoin(User, User.id == UsageLog.user_id)
        .outerjoin(Tool, Tool.id == UsageLog.tool_id)
        .filter(
            UsageLog.tool_id.in_(ids or [-1]),
            UsageLog.status.in_(('completed', 'preview')),
            UsageLog.created_at >= since,
        )
        .order_by(UsageLog.created_at.desc())
        .limit(20)
        .all()
    )
    recent = [
        {
            "id": log.id,
            "tool_id": log.tool_id,
            "tool_name": tool_name,
            "user_id": log.user_id,
            "user_name": user_name or username or ("访客" if log.user_id is None else None),
            "input_text": log.input_text,
            "output_text": log.output_text,
            "session_id": log.session_id,
            "status": log.status,
            "latency_ms": log.latency_ms,
            "created_at": log.created_at,
            "completed_at": log.completed_at,
        }
        for log, user_name, username, tool_name in recent_rows
    ]
    total_tools = len(ids)
    return {"days": days, "tool_id": tool_id, "total_tools": total_tools, "total_usage": total, "today_usage": trend[-1]["count"], "distinct_students": distinct_students, "active_students": distinct_students, "total_users": distinct_students, "preview_count": preview_total, "weekly_trend": trend, "trend": trend, "top_tools": [{"id": row.id, "name": row.name, "count": row.count, "percentage": round(row.count * 100 / total, 2) if total else 0} for row in ranking], "recent_logs": recent}

@router.get("/my")
def get_my_usage(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(UsageLog).filter(UsageLog.user_id == current_user.id).order_by(UsageLog.created_at.desc())
    total = query.count(); items = query.offset((page-1)*page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.get("/student-stats")
def student_stats(db: Session = Depends(get_db), user: User = Depends(require_roles("student", "admin"))):
    logs = db.query(UsageLog).filter(UsageLog.user_id == user.id, UsageLog.status == "completed").order_by(UsageLog.created_at.desc()).all()
    dates = {row.created_at.date() for row in logs if row.created_at}; today = datetime.utcnow().date(); streak = 0
    while today in dates: streak += 1; today -= timedelta(days=1)
    return {"total_interactions": len(logs), "distinct_tools": len({row.tool_id for row in logs if row.tool_id is not None}), "consecutive_days": streak, "recent_records": logs[:20]}

@router.get("/tool/{tool_id}")
def get_tool_usage(tool_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("teacher", "admin"))):
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool: raise HTTPException(status_code=404, detail="工具不存在")
    if current_user.role != "admin" and tool.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权查看该工具数据")
    data = _dashboard(db, current_user, 7, tool_id)
    return {"tool_id": tool_id, "total_usage": data["total_usage"], "today_usage": data["today_usage"], "distinct_students": data["distinct_students"]}

@router.get("/dashboard")
def get_dashboard(days: int = Query(7), tool_id: int | None = Query(None), db: Session = Depends(get_db), current_user: User = Depends(require_roles("teacher", "admin"))):
    return _dashboard(db, current_user, days, tool_id)

@router.get("/dashboard/export")
def export_dashboard(days: int = Query(7), tool_id: int | None = Query(None), db: Session = Depends(get_db), current_user: User = Depends(require_roles("teacher", "admin"))):
    data = _dashboard(db, current_user, days, tool_id); output = io.StringIO(); writer = csv.writer(output); writer.writerow(["tool_id", "tool_name", "usage_count", "percentage"])
    for row in data["top_tools"]: writer.writerow([row["id"], row["name"], row["count"], row["percentage"]])
    return StreamingResponse(iter([output.getvalue().encode("utf-8-sig")]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=dashboard.csv"})
