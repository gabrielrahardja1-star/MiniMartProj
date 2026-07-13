from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from app.config import settings
import app.models  # noqa: ensure all models are registered with SQLAlchemy
from app.routers import auth, invoices, products, orders, admin, payments, wallet
from app.tasks.monthly_topup import monthly_worker_topup

app = FastAPI(
    title="MiniMart API",
    description="Mining Site Inventory & Purchasing System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(invoices.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(payments.router)
app.include_router(wallet.router)

# Initialize background scheduler for monthly top-ups
scheduler = BackgroundScheduler()
scheduler.add_job(monthly_worker_topup, "cron", day=1, hour=0, minute=0, id="monthly_topup")


@app.on_event("startup")
def start_scheduler():
    scheduler.start()


@app.on_event("shutdown")
def shutdown_scheduler():
    scheduler.shutdown()


app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def root():
    return {"status": "ok", "app": "MiniMart API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
