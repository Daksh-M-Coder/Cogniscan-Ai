import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # App
    APP_NAME: str = "CogniScan Assessment Service"
    DEBUG: bool = False
    VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/cogniscan"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT
    JWT_SECRET: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # ML Service
    ML_SERVICE_URL: str = "http://localhost:8001"
    
    # Assessment settings
    MAX_ASSESSMENT_DURATION_MIN: int = 30
    DEFAULT_ASSESSMENT_INTERVAL_HOURS: int = 24
    
    # Alert thresholds
    ALERT_THRESHOLD_WARNING: float = 0.5
    ALERT_THRESHOLD_HIGH: float = 0.6
    ALERT_THRESHOLD_CRITICAL: float = 0.8
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
