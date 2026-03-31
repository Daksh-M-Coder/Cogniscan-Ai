from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

from src.config import get_settings
from src.database import init_db
from src.routes import assessments, alerts, recommendations
import logging

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting up Assessment Service...")
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down Assessment Service...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="API for cognitive assessment management and risk scoring",
    lifespan=lifespan
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure for production
)

# Include routers
app.include_router(assessments.router)
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "assessment-service",
        "version": settings.VERSION
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "docs": "/docs"
    }
