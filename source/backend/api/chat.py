import asyncio
import json
import time
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from api.dependencies import get_current_user, get_optional_user, require_roles
from models.conversation import ConversationMessage, ConversationSession
from models.database import SessionLocal, get_db
from models.tool import Tool
from models.usage import UsageLog
from models.user import User
from schemas.chat import ChatRequest, ChatResponse
from services.deepseek import AIConfigurationError, DeepSeekRequestError, chat_with_deepseek, stream_with_deepseek
from services.tool_access_service import assert_tool_can_be_used, can_manage_tool, can_view_public_share

router = APIRouter()

def _can_chat(user: User | None, tool: Tool | None) -> bool:
    """Students can use published tools; teachers can preview own/preset tools; admins can diagnose all."""
    if user is None:
        return bool(tool and can_view_public_share(tool))
    if user.role == "student":
        return True
    if user.role == "admin":
        return True
    if tool is None:
        return False
    return tool.is_preset or can_manage_tool(user, tool)

def _session(db, user_id: int | None, requested: str | None, tool_id: int | None):
    if requested:
        query = db.query(ConversationSession).filter(
            ConversationSession.id == requested,
            ConversationSession.tool_id == tool_id,
        )
        query = query.filter(
            ConversationSession.user_id.is_(None)
            if user_id is None
            else ConversationSession.user_id == user_id
        )
        row = query.first()
        if not row: raise HTTPException(status_code=403, detail="会话不存在或不属于当前用户")
        return row
    row = ConversationSession(id=str(uuid.uuid4()), user_id=user_id, tool_id=tool_id); db.add(row); db.flush(); return row

def _tool(db, user: User | None, tool_id: int | None, share_code: str | None):
    if not tool_id: return None
    row = db.query(Tool).filter(Tool.id == tool_id).first()
    if not row: raise HTTPException(status_code=404, detail="工具不存在")
    if share_code:
        if row.share_code != share_code or not can_view_public_share(row):
            raise HTTPException(status_code=404, detail="分享链接不存在、已过期或已撤销")
        return row
    if user is None:
        raise HTTPException(status_code=401, detail="请通过有效的分享链接访问工具")
    assert_tool_can_be_used(user, row); return row

def _history(db, session_id):
    rows = db.query(ConversationMessage).filter(ConversationMessage.session_id == session_id).order_by(ConversationMessage.created_at.desc()).limit(12).all()
    return [{"role": row.role, "content": row.content} for row in reversed(rows)]

def _complete(db, user: User | None, session, tool, message, reply, started, usage_mode: str = "student_use"):
    # Anonymous share-link usage is a real student interaction for aggregate
    # tool counts, but it intentionally has no user identity.
    is_student = user is None or (user.role == "student" and usage_mode == "student_use")
    db.add_all([
        ConversationMessage(session_id=session.id, role="user", content=message),
        ConversationMessage(session_id=session.id, role="assistant", content=reply),
        UsageLog(
            user_id=user.id if user else None,
            tool_id=tool.id if tool else None,
            input_text=message,
            output_text=reply,
            session_id=session.id,
            status="completed" if is_student else "preview",
            latency_ms=int((time.perf_counter() - started) * 1000),
            completed_at=datetime.utcnow(),
        ),
    ])
    if tool and is_student:
        tool.usage_count += 1
    session.last_activity_at = datetime.utcnow()
    db.commit()

@router.post("/", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    tool = _tool(db, user, payload.tool_id, payload.share_code)
    if not _can_chat(user, tool):
        raise HTTPException(status_code=403, detail="无权使用该工具。学生可使用广场工具，教师可预览自己创建的工具。")
    session = _session(db, user.id if user else None, payload.session_id, payload.tool_id); started = time.perf_counter()
    try:
        history = _history(db, session.id)
        reply = await chat_with_deepseek(payload.message, tool.prompt_template if tool else None, history)
    except AIConfigurationError as error: raise HTTPException(status_code=503, detail=str(error))
    except DeepSeekRequestError as error: raise HTTPException(status_code=error.status_code, detail=str(error))
    _complete(db, user, session, tool, payload.message, reply, started, payload.usage_mode)
    return ChatResponse(reply=reply, session_id=session.id, tool_name=tool.name if tool else None)

@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(ConversationSession).filter(ConversationSession.user_id == user.id).order_by(ConversationSession.last_activity_at.desc()).limit(50).all()
    result = []
    for row in rows:
        first_question = db.query(ConversationMessage.content).filter(
            ConversationMessage.session_id == row.id,
            ConversationMessage.role == "user",
        ).order_by(ConversationMessage.created_at.asc()).first()
        preview = (first_question[0] or "").strip() if first_question else ""
        if len(preview) > 48:
            preview = preview[:48] + "…"
        result.append({"id": row.id, "tool_id": row.tool_id, "created_at": row.created_at, "last_activity_at": row.last_activity_at, "preview": preview})
    return result

@router.get("/sessions/{session_id}/messages")
def get_session_messages(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = db.query(ConversationSession).filter(ConversationSession.id == session_id, ConversationSession.user_id == user.id).first()
    if not session: raise HTTPException(status_code=404, detail="会话不存在")
    messages = db.query(ConversationMessage).filter(ConversationMessage.session_id == session_id).order_by(ConversationMessage.created_at).all()
    return {"session_id": session_id, "tool_id": session.tool_id, "messages": [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at} for m in messages]}

@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = db.query(ConversationSession).filter(ConversationSession.id == session_id, ConversationSession.user_id == user.id).first()
    if not session: raise HTTPException(status_code=404, detail="会话不存在")
    db.query(ConversationMessage).filter(ConversationMessage.session_id == session_id).delete()
    db.delete(session); db.commit()

@router.post("/stream")
async def stream_chat(payload: ChatRequest, request: Request, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    tool = _tool(db, user, payload.tool_id, payload.share_code)
    if not _can_chat(user, tool):
        raise HTTPException(status_code=403, detail="无权使用该工具。学生可使用广场工具，教师可预览自己创建的工具。")
    session = _session(db, user.id if user else None, payload.session_id, payload.tool_id)
    # FastAPI closes request-scoped dependencies before a StreamingResponse is
    # consumed. Capture all metadata while this request session is still open,
    # then use a dedicated session for the lifetime of the stream.
    session_id = session.id
    user_id = user.id if user else None
    tool_id = tool.id if tool else None
    tool_name = tool.name if tool else None
    system_prompt = tool.prompt_template if tool else None
    usage_mode = "student_use" if user is None else payload.usage_mode
    db.commit()

    async def events():
        stream_db = SessionLocal()
        reply = ""; started = time.perf_counter()
        is_student = usage_mode == "student_use"
        try:
            stream_session = stream_db.get(ConversationSession, session_id)
            stream_user = stream_db.get(User, user_id) if user_id is not None else None
            stream_tool = stream_db.get(Tool, tool_id) if tool_id else None
            if not stream_session or (user_id is not None and not stream_user):
                raise AIConfigurationError("会话已失效，请重新发起对话")
            yield f"event: meta\ndata: {json.dumps({'session_id': session_id, 'tool_name': tool_name})}\n\n"
            async for item in stream_with_deepseek(payload.message, system_prompt, _history(stream_db, session_id)):
                if await request.is_disconnected():
                    stream_db.add(UsageLog(user_id=user_id, tool_id=tool_id, input_text=payload.message, session_id=session_id, status="aborted")); stream_db.commit(); return
                if item["kind"] == "reasoning":
                    yield f"event: reasoning\ndata: {json.dumps({'text': item['text']}, ensure_ascii=False)}\n\n"
                    continue
                reply += item["text"]
                yield f"event: delta\ndata: {json.dumps({'text': item['text']}, ensure_ascii=False)}\n\n"
            _complete(stream_db, stream_user, stream_session, stream_tool, payload.message, reply, started, usage_mode)
            yield f"event: done\ndata: {json.dumps({'session_id': session_id})}\n\n"
        except (GeneratorExit, asyncio.CancelledError):
            # Client aborted mid-stream; record the incomplete attempt.
            stream_db.add(UsageLog(user_id=user_id, tool_id=tool_id, input_text=payload.message, session_id=session_id, status="aborted")); stream_db.commit()
            raise
        except (AIConfigurationError, DeepSeekRequestError) as error:
            stream_db.add(UsageLog(user_id=user_id, tool_id=tool_id, input_text=payload.message, session_id=session_id, status="aborted")); stream_db.commit()
            yield f"event: error\ndata: {json.dumps({'message': str(error)}, ensure_ascii=False)}\n\n"
        finally:
            stream_db.close()
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
