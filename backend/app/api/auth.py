import uuid
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.schemas.auth_schema import UserRegisterRequest, UserLoginRequest, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(user_data: UserRegisterRequest, db: Session = Depends(get_db)):
    email = str(user_data.email).lower().strip()
    
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    hashed_pwd = hash_password(user_data.password)
    new_user = User(
        id=f"usr_{uuid.uuid4().hex[:8]}",
        email=email,
        password_hash=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token({"sub": email, "user_id": new_user.id})
    return TokenResponse(access_token=token, token_type="bearer", email=email)

@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLoginRequest, db: Session = Depends(get_db)):
    email = str(user_data.email).lower().strip()
    user = db.query(User).filter(User.email == email).first()
    
    
    if not user:
        hashed_pwd = hash_password(user_data.password)
        user = User(
            id=f"usr_{uuid.uuid4().hex[:8]}",
            email=email,
            password_hash=hashed_pwd
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_access_token({"sub": email, "user_id": user.id})
        return TokenResponse(access_token=token, token_type="bearer", email=email)

    
    if not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    token = create_access_token({"sub": email, "user_id": user.id})
    return TokenResponse(access_token=token, token_type="bearer", email=email)