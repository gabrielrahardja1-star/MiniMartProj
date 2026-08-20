from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import app.models  # noqa: ensure all models are registered with SQLAlchemy
from app.routers import auth, invoices, products, orders, admin, payments, wallet, mobile

app = FastAPI(
    title="MiniMart API",
    description="Mining Site Inventory & Purchasing System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    # Auth is Bearer-token based (no cookies), so a wildcard origin carries
    # no session-hijack risk. Needed for real web-engine clients that
    # enforce CORS (the desktop app's WebView2 shell) — native HTTP
    # clients like Android's OkHttp never triggered this since CORS is a
    # browser-only mechanism, and the web frontend is same-origin via its
    # nginx proxy so it never preflights either.
    allow_origins=["*"],
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
app.include_router(mobile.router)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def root():
    return {"status": "ok", "app": "MiniMart API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
