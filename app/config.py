from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    # Postgres. The default points at the `postgres` container published on 5433
    # for local dev (`docker compose up -d postgres`); the server overrides it via
    # .env with the in-network host `postgres:5432`.
    DATABASE_URL: str = "postgresql+psycopg://minimart:minimart@localhost:5433/minimart"
    ENV: str = "development"
    DEBUG: bool = True

    # Midtrans
    MIDTRANS_SERVER_KEY: str = ""
    MIDTRANS_CLIENT_KEY: str = ""
    MIDTRANS_IS_PRODUCTION: bool = False

    FRONTEND_URL: str = "http://localhost:8080"

    # Cloudflare R2 (S3-compatible object storage) for product photos.
    # Falls back to local disk (uploads/products/) when unset, so local dev
    # needs no R2 account.
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_PUBLIC_URL: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
