from pydantic_settings import BaseSettings
from typing import List, Literal

class Settings(BaseSettings):
    # 应用配置
    APP_NAME: str = "智教通"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "development-only-change-me"
    JWT_IDLE_MINUTES: int = 30
    JWT_MAX_SESSION_HOURS: int = 12
    SESSION_TOUCH_INTERVAL_SECONDS: int = 60
    
    # 数据库配置
    DATABASE_URL: str = "mysql+pymysql://zjiaotong_app:change-me@127.0.0.1:3306/zjiaotong"
    BACKUP_DATABASE_URL: str = ""
    
    # mock 用于开发/答辩备用；deepseek 模式必须配置有效的 DEEPSEEK_API_KEY。
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-chat"
    DEEPSEEK_API_URL: str = "https://api.deepseek.com"
    AI_PROVIDER: Literal["mock", "deepseek"] = "mock"

    # Human verification and external platform integration.
    CAPTCHA_PROVIDER: Literal["disabled", "turnstile"] = "disabled"
    TURNSTILE_SECRET_KEY: str = ""
    CAPTCHA_BYPASS: bool = False
    AGENT_PLATFORM_URL: str = ""
    
    # CORS and frontend configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    FRONTEND_URL: str = "http://localhost:5173"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
