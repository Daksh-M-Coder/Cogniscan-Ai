from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, func
from typing import List, Optional
from datetime import datetime, timedelta
import httpx

from src.database import get_db
from src.models import Assessment, Alert, Recommendation, CognitiveBaseline, User
from src.schemas import (
    AssessmentCreateRequest, AssessmentResponse, RiskScoreResponse,
    TrendResponse, TrendDataPoint, AlertResponse, RecommendationResponse,
    DashboardSummaryResponse, RiskCategory, AlertType
)
from src.config import get_settings
from src.services.risk_calculator import RiskCalculator
from src.services.trend_analyzer import TrendAnalyzer
from src.services.alert_engine import AlertEngine

router = APIRouter(prefix="/api/v1/assessments", tags=["assessments"])
security = HTTPBearer()
settings = get_settings()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Validate JWT and return user_id"""
    # In production, validate JWT against user-service
    # For now, extract from token payload
    token = credentials.credentials
    # TODO: Implement proper JWT validation
    return "user-id-from-token"


@router.post("", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assessment(
    request: AssessmentCreateRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new assessment session"""
    
    # Check for recent assessments (rate limiting)
    recent_query = select(Assessment).where(
        and_(
            Assessment.user_id == user_id,
            Assessment.started_at >= datetime.utcnow() - timedelta(hours=12)
        )
    )
    recent_result = await db.execute(recent_query)
    if recent_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Assessment already started within last 12 hours"
        )
    
    # Create assessment record
    assessment = Assessment(
        user_id=user_id,
        speech_features=request.speech_features,
        facial_features=request.facial_features,
        cognitive_task_scores=request.cognitive_task_scores,
        duration_seconds=request.duration_seconds,
        status=AssessmentStatus.PENDING
    )
    
    db.add(assessment)
    await db.flush()
    await db.refresh(assessment)
    
    return AssessmentResponse(
        id=str(assessment.id),
        user_id=str(assessment.user_id),
        status=assessment.status,
        started_at=assessment.started_at,
        duration_seconds=assessment.duration_seconds,
        created_at=assessment.created_at
    )


@router.post("/{assessment_id}/submit", response_model=AssessmentResponse)
async def submit_assessment_data(
    assessment_id: str,
    request: AssessmentSubmitRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit processed assessment data and compute risk scores"""
    
    # Get assessment
    query = select(Assessment).where(
        and_(Assessment.id == assessment_id, Assessment.user_id == user_id)
    )
    result = await db.execute(query)
    assessment = result.scalar_one_or_none()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Call ML service for fusion scoring
    async with httpx.AsyncClient() as client:
        try:
            ml_response = await client.post(
                f"{settings.ML_SERVICE_URL}/api/v1/predict",
                json={
                    "speech_embedding": request.speech_embedding,
                    "facial_embedding": request.facial_embedding,
                    "cognitive_scores": request.cognitive_scores
                },
                timeout=30.0
            )
            ml_result = ml_response.json()
        except httpx.RequestError:
            # Fallback to local risk calculation
            calculator = RiskCalculator()
            ml_result = calculator.calculate_fallback(request)
    
    # Update assessment with scores
    assessment.speech_risk_score = ml_result.get("speech_score")
    assessment.facial_risk_score = ml_result.get("facial_score")
    assessment.cognitive_risk_score = ml_result.get("cognitive_score")
    assessment.overall_risk_score = ml_result["overall_score"]
    assessment.risk_category = ml_result["risk_category"]
    assessment.contributing_factors = ml_result.get("contributing_factors", [])
    assessment.status = "completed"
    assessment.completed_at = datetime.utcnow()
    
    await db.flush()
    
    # Check for alerts
    alert_engine = AlertEngine(db)
    await alert_engine.evaluate_and_create_alerts(user_id, assessment)
    
    # Generate recommendations
    await alert_engine.generate_recommendations(user_id, assessment)
    
    await db.commit()
    
    return AssessmentResponse(
        id=str(assessment.id),
        user_id=str(assessment.user_id),
        status=assessment.status,
        started_at=assessment.started_at,
        completed_at=assessment.completed_at,
        duration_seconds=assessment.duration_seconds,
        risk_score=RiskScoreResponse(
            overall_score=assessment.overall_risk_score,
            speech_score=assessment.speech_risk_score,
            facial_score=assessment.facial_risk_score,
            cognitive_score=assessment.cognitive_risk_score,
            risk_category=RiskCategory(assessment.risk_category),
            contributing_factors=assessment.contributing_factors or []
        ),
        contributing_factors=assessment.contributing_factors,
        created_at=assessment.created_at
    )


@router.get("", response_model=List[AssessmentResponse])
async def list_assessments(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """List user's assessment history"""
    
    query = select(Assessment).where(
        Assessment.user_id == user_id
    ).order_by(desc(Assessment.created_at)).limit(limit).offset(offset)
    
    result = await db.execute(query)
    assessments = result.scalars().all()
    
    return [
        AssessmentResponse(
            id=str(a.id),
            user_id=str(a.user_id),
            status=a.status,
            started_at=a.started_at,
            completed_at=a.completed_at,
            duration_seconds=a.duration_seconds,
            risk_score=RiskScoreResponse(
                overall_score=a.overall_risk_score,
                speech_score=a.speech_risk_score,
                facial_score=a.facial_risk_score,
                cognitive_score=a.cognitive_risk_score,
                risk_category=RiskCategory(a.risk_category) if a.risk_category else None,
                contributing_factors=a.contributing_factors or []
            ) if a.overall_risk_score else None,
            created_at=a.created_at
        )
        for a in assessments
    ]


@router.get("/trends", response_model=TrendResponse)
async def get_trends(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=7, le=90)
):
    """Get cognitive trend analysis"""
    
    since = datetime.utcnow() - timedelta(days=days)
    
    query = select(Assessment).where(
        and_(
            Assessment.user_id == user_id,
            Assessment.status == "completed",
            Assessment.completed_at >= since
        )
    ).order_by(Assessment.completed_at)
    
    result = await db.execute(query)
    assessments = result.scalars().all()
    
    if len(assessments) < 3:
        raise HTTPException(
            status_code=400,
            detail="Insufficient data for trend analysis (minimum 3 assessments)"
        )
    
    # Analyze trends
    analyzer = TrendAnalyzer()
    trend_data = analyzer.analyze(assessments)
    
    return TrendResponse(
        user_id=user_id,
        data_points=[
            TrendDataPoint(
                date=a.completed_at,
                overall_score=a.overall_risk_score,
                speech_score=a.speech_risk_score,
                facial_score=a.facial_risk_score,
                cognitive_score=a.cognitive_risk_score
            )
            for a in assessments if a.overall_risk_score
        ],
        trend_direction=trend_data["direction"],
        trend_percentage=trend_data["percentage_change"],
        volatility=trend_data["volatility"]
    )


@router.get("/dashboard", response_model=DashboardSummaryResponse)
async def get_dashboard(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard summary for user"""
    
    # Latest assessment
    latest_query = select(Assessment).where(
        and_(Assessment.user_id == user_id, Assessment.status == "completed")
    ).order_by(desc(Assessment.created_at))
    latest_result = await db.execute(latest_query)
    latest = latest_result.scalar_one_or_none()
    
    # Active alerts
    alerts_query = select(Alert).where(
        and_(Alert.user_id == user_id, Alert.acknowledged == False)
    ).order_by(desc(Alert.created_at))
    alerts_result = await db.execute(alerts_query)
    alerts = alerts_result.scalars().all()
    
    # Pending recommendations
    recs_query = select(Recommendation).where(
        and_(
            Recommendation.user_id == user_id,
            Recommendation.followed == False,
            Recommendation.expires_at > datetime.utcnow()
        )
    ).order_by(desc(Recommendation.created_at))
    recs_result = await db.execute(recs_query)
    recommendations = recs_result.scalars().all()
    
    # Assessment streak
    streak_query = select(func.count(Assessment.id)).where(
        and_(
            Assessment.user_id == user_id,
            Assessment.status == "completed",
            Assessment.completed_at >= datetime.utcnow() - timedelta(days=7)
        )
    )
    streak_result = await db.execute(streak_query)
    streak = streak_result.scalar() or 0
    
    return DashboardSummaryResponse(
        user_id=user_id,
        latest_assessment=AssessmentResponse(
            id=str(latest.id),
            user_id=str(latest.user_id),
            status=latest.status,
            started_at=latest.started_at,
            completed_at=latest.completed_at,
            duration_seconds=latest.duration_seconds,
            risk_score=RiskScoreResponse(
                overall_score=latest.overall_risk_score,
                speech_score=latest.speech_risk_score,
                facial_score=latest.facial_risk_score,
                cognitive_score=latest.cognitive_risk_score,
                risk_category=RiskCategory(latest.risk_category) if latest.risk_category else None,
                contributing_factors=latest.contributing_factors or []
            ) if latest and latest.overall_risk_score else None,
            created_at=latest.created_at
        ) if latest else None,
        current_risk_score=latest.overall_risk_score if latest else None,
        risk_category=RiskCategory(latest.risk_category) if latest and latest.risk_category else None,
        active_alerts=[
            AlertResponse(
                id=str(a.id),
                alert_type=AlertType(a.alert_type),
                title=a.title,
                message=a.message,
                trigger_metrics=a.trigger_metrics,
                acknowledged=a.acknowledged,
                acknowledged_at=a.acknowledged_at,
                created_at=a.created_at
            )
            for a in alerts
        ],
        pending_recommendations=[
            RecommendationResponse(
                id=str(r.id),
                recommendation_type=r.recommendation_type,
                title=r.title,
                content=r.content,
                action_link=r.action_link,
                reasoning=r.reasoning,
                helpful=r.helpful,
                followed=r.followed,
                created_at=r.created_at,
                expires_at=r.expires_at
            )
            for r in recommendations
        ],
        assessment_streak_days=streak,
        next_assessment_due=datetime.utcnow() + timedelta(hours=24) if latest else None
    )
