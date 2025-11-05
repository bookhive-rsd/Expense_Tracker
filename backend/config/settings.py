from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import Field, field_validator

class Settings(BaseSettings):
    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017/expense_tracker"
    DATABASE_NAME: str = "expense_tracker"
    
    # JWT
    JWT_SECRET_KEY: str = "cExwsoIdxOWV7lGmUdsobKSN7SEu6sAHy8oxR_jUUT8"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = "660588293356-cn4avuvo2mcrsdso2vffvhs0lenkh5t5.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: str = "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"
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/callback"
    
    # Gemini AI
    GEMINI_API_KEY: str = "AIzaSyBcnPIGkKdkSpoJaPv3W3mw3uV7c9pH2QI"
    
    # Gmail SMTP
    GMAIL_USER: str = "bookhive.rsd@gmail.com"
    GMAIL_PASSWORD: str = "dvjj blxj zyde tukh"
    
    # Firebase Cloud Messaging
    FCM_SERVER_KEY: str = ""
    
    # Cloudinary (optional)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    
    # CORS
    ALLOWED_ORIGINS: Union[List[str], str] = Field(default=["http://localhost:3000", "http://localhost:5173"])

    @field_validator("ALLOWED_ORIGINS", mode='before')
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        return v
    
    # Currency API
    CURRENCY_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()