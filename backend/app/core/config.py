import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))
load_dotenv()

class Settings:
    PROJECT_NAME: str = "CloudBot Backend"
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    CHROMA_PATH: str = os.getenv("CHROMA_PATH", "./chroma_db")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploaded_files")
    
    # 🔹 JWT Configuration
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-in-prod-123456")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)