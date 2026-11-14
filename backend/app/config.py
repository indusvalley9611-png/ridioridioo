"""NEXORA RIDE - Backend Configuration."""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "NEXORA RIDE Backend"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Database configuration
    # Default uses PostgreSQL; SQLite supported for zero-config local demo & tests
    DATABASE_URL: str = "sqlite:///./nexora_ride.db"

    # CORS configuration - explicit allowed origins to prevent unauthorized cross-origin access
    CORS_ORIGINS: List[str] = [
        "http://localhost:8081",
        "http://localhost:19006",
        "http://127.0.0.1:8081",
        "http://localhost:3000",
        "http://10.0.2.2:8000",
    ]

    # Security & Administration
    ADMIN_SECRET_KEY: str = "nexora_admin_secret_dev_2026"

    # Security & Customer Authentication
    DEMO_CUSTOMER_ID: str = "cust_gokul_01"
    DEMO_CUSTOMER_NAME: str = "Gokul R."
    DEMO_CUSTOMER_PHONE: str = "+919876543210"

    # Twilio Official Integration
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
