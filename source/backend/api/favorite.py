from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.dependencies import require_roles
from models.database import get_db
from models.favorite import Favorite
from models.tool import Tool
from models.user import User
from services.tool_access_service import is_plaza_visible, public_tool_payload

router = APIRouter()

@router.put("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
def add_favorite(tool_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("student", "admin"))):
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool or not is_plaza_visible(tool):
        raise HTTPException(status_code=404, detail="工具不存在或不可收藏")
    if not db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.tool_id == tool_id).first():
        db.add(Favorite(user_id=user.id, tool_id=tool_id)); db.commit()

@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(tool_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("student", "admin"))):
    db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.tool_id == tool_id).delete(); db.commit()

@router.get("")
def list_favorites(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), user: User = Depends(require_roles("student", "admin"))):
    query = db.query(Favorite).filter(Favorite.user_id == user.id).order_by(Favorite.created_at.desc())
    total = query.count(); rows = query.offset((page - 1) * page_size).limit(page_size).all(); items = []
    for favorite in rows:
        tool = db.query(Tool).filter(Tool.id == favorite.tool_id).first()
        if tool and is_plaza_visible(tool):
            item = public_tool_payload(tool); item["favorited_at"] = favorite.created_at; items.append(item)
    return {"items": items, "total": total, "page": page, "page_size": page_size}
