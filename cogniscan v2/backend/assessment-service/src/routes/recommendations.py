from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from typing import List
from datetime import datetime

from src.database import get_db
from src.models import Recommendation
from src.schemas import RecommendationResponse, RecommendationFeedbackRequest

router = APIRouter(tags=["recommendations"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    return "user-id-from-token"


@router.get("/recommendations", response_model=List[RecommendationResponse])
async def list_recommendations(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    pending_only: bool = True
):
    """List user's recommendations"""
    
    query = select(Recommendation).where(Recommendation.user_id == user_id)
    
    if pending_only:
        query = query.where(
            and_(
                Recommendation.followed == False,
                Recommendation.expires_at > datetime.utcnow()
            )
        )
    
    query = query.order_by(desc(Recommendation.created_at))
    
    result = await db.execute(query)
    recommendations = result.scalars().all()
    
    return [
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
    ]


@router.post("/recommendations/{recommendation_id}/feedback", response_model=RecommendationResponse)
async def submit_feedback(
    recommendation_id: str,
    request: RecommendationFeedbackRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit feedback for a recommendation"""
    
    query = select(Recommendation).where(
        and_(Recommendation.id == recommendation_id, Recommendation.user_id == user_id)
    )
    result = await db.execute(query)
    recommendation = result.scalar_one_or_none()
    
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    recommendation.helpful = request.helpful
    recommendation.feedback_at = datetime.utcnow()
    
    if request.followed is not None:
        recommendation.followed = request.followed
        recommendation.followed_at = datetime.utcnow() if request.followed else None
    
    await db.commit()
    
    return RecommendationResponse(
        id=str(recommendation.id),
        recommendation_type=recommendation.recommendation_type,
        title=recommendation.title,
        content=recommendation.content,
        action_link=recommendation.action_link,
        reasoning=recommendation.reasoning,
        helpful=recommendation.helpful,
        followed=recommendation.followed,
        created_at=recommendation.created_at,
        expires_at=recommendation.expires_at
    )
