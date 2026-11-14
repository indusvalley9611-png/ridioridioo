"""NEXORA RIDE - FastAPI Application Entry Point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.routers import health, rides, carpool, auth, safety, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler (replaces on_event startup/shutdown)."""
    # Create tables automatically if they do not exist
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for NEXORA RIDE Indian urban mobility platform.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount versioned routers
app.include_router(health.router)
app.include_router(rides.router)
app.include_router(carpool.router)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(safety.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Fallback handler to prevent unhandled 500 exceptions from leaking stack traces."""
    # In debug mode or if HTTPException, standard behavior preserved
    if settings.DEBUG:
        raise exc
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )
