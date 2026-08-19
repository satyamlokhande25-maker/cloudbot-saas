from sqlalchemy import Column, String, DateTime, Text, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    message_count = Column(Integer, default=0)  # Free tier usage counter
    message_limit = Column(Integer, default=50) # Free limit (50 messages)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bots = relationship("Bot", back_populates="owner")


class Bot(Base):
    __tablename__ = "bots"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    system_prompt = Column(Text, default="You are a helpful AI customer support assistant.")
    temperature = Column(Float, default=0.2)
    theme_color = Column(String, default="#4f46e5")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="bots")
    chat_logs = relationship("ChatMessage", back_populates="bot")
    leads = relationship("Lead", back_populates="bot")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, index=True)
    bot_id = Column(String, ForeignKey("bots.id"), nullable=False)
    sender = Column(String, nullable=False)  # 'user' or 'bot'
    message = Column(Text, nullable=False)
    feedback = Column(String, nullable=True)  # 'up' | 'down' | None
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bot = relationship("Bot", back_populates="chat_logs")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True, index=True)
    bot_id = Column(String, ForeignKey("bots.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bot = relationship("Bot", back_populates="leads")