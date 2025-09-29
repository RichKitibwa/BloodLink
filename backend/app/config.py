from pydantic_settings import BaseSettings
from typing import List
import secrets
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    
    # App
    APP_NAME: str = "BloodLink"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "Uganda Blood Donation Management System"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://bloodlink_user:bloodlink_password@localhost:5433/bloodlink_db"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # CORS origins - let pydantic handle the parsing
    CORS_ORIGINS: str = "http://localhost:3001,http://localhost:3000,http://localhost:5173"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings() 
