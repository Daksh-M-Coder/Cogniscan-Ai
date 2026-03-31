from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from typing import List
from datetime import datetime

from src.database import get_db
from src.models import Alert, Recommendation
from src.schemas import AlertResponse, AlertAcknowledgeRequest, AlertType
from src.schemas import RecommendationResponse, RecommendationFeedbackRequest

router = APIRouter(tags=["alerts"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    return "user-id-from-token"


@router.get("/alerts", response_model=List[AlertResponse])
async def list_alerts(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    acknowledged: bool = None
):
    """List user's alerts"""
    
    query = select(Alert).where(Alert.user_id == user_id)
    
    if acknowledged is not None:
        query = query.where(Alert.acknowledged == acknowledged)
    
    query = query.order_by(desc(Alert.created_at))
    
    result = await db.execute(query)
    alerts = result.scalars().all()
    
    return [
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
    ]


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    request: AlertAcknowledgeRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Acknowledge an alert"""
    
    query = select(Alert).where(
        and_(Alert.id == alert_id, Alert.user_id == user_id)
    )
    result = await db.execute(query)
    alert = result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.acknowledged = request.acknowledged
    alert.acknowledged_at = datetime.utcnow() if request.acknowledged else None
    
    await db.commit()
    
    return AlertResponse(
        id=str(alert.id),
        alert_type=AlertType(alert.alert_type),
        title=alert.title,
        message=alert.message,
        trigger_metrics=alert.trigger_metrics,
        acknowledged=alert.acknowledged,
        acknowledged_at=alert.acknowledged_at,
        created_at=alert.created_at
    )
