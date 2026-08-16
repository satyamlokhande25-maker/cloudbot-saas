import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.db.models import Bot, User
from app.schemas.bot_schema import BotCreateRequest, BotResponse
from app.core.security import get_current_user

router = APIRouter(prefix="/bots", tags=["Bot Management"])

@router.post("/", response_model=BotResponse)
def create_bot(
    request: BotCreateRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_bot = Bot(
        id=f"bot_{uuid.uuid4().hex[:8]}",
        user_id=current_user.id,
        name=request.name,
        system_prompt=request.system_prompt or "You are a helpful AI customer support assistant.",
        temperature=request.temperature if request.temperature is not None else 0.2
    )
    db.add(new_bot)
    db.commit()
    db.refresh(new_bot)
    return new_bot

@router.get("/", response_model=List[BotResponse])
def get_user_bots(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_bots = db.query(Bot).filter(Bot.user_id == current_user.id).all()
    
    # Always guarantee Default Assistant (test_bot_1) is present
    has_default = any(b.id == "test_bot_1" for b in user_bots)
    if not has_default:
        default_bot = db.query(Bot).filter(Bot.id == "test_bot_1").first()
        if not default_bot:
            default_bot = Bot(
                id="test_bot_1",
                user_id=current_user.id,
                name="Default Assistant",
                system_prompt="You are a helpful AI assistant.",
                temperature=0.2
            )
            db.add(default_bot)
            db.commit()
            db.refresh(default_bot)
        user_bots.insert(0, default_bot)

    return user_bots

@router.get("/{bot_id}", response_model=BotResponse)
def get_bot_details(bot_id: str, db: Session = Depends(get_db)):
    if bot_id == "test_bot_1":
        default_bot = db.query(Bot).filter(Bot.id == "test_bot_1").first()
        if not default_bot:
            return BotResponse(
                id="test_bot_1",
                name="Default Assistant",
                system_prompt="You are a helpful AI assistant.",
                temperature=0.2
            )
        return default_bot

    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found.")
    return bot