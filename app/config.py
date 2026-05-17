from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    DATABASE_URL: str = "sqlite:///./minimart.db"
    ENV: str = "development"
    DEBUG: bool = True

    # Midtrans
    MIDTRANS_SERVER_KEY: str = ""
    MIDTRANS_CLIENT_KEY: str = ""
    MIDTRANS_IS_PRODUCTION: bool = False

    FRONTEND_URL: str = "http://localhost:8080"

    class Config:
        env_file = ".env"


settings = Settings()
