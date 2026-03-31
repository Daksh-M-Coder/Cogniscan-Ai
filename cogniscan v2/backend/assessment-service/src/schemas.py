from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class RiskCategory(str, Enum):
    LOW = "low"
    MILD = "mild"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ALERT = "alert"
    CRITICAL = "critical"


class AssessmentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Request schemas
class AssessmentCreateRequest(BaseModel):
    speech_features: Optional[Dict[str, Any]] = None
    facial_features: Optional[Dict[str, Any]] = None
    cognitive_task_scores: Optional[Dict[str, Any]] = None
    duration_seconds: int
    device_info: Optional[Dict[str, Any]] = None


class AssessmentSubmitRequest(BaseModel):
    assessment_id: str
    speech_embedding: Optional[List[float]] = None
    facial_embedding: Optional[List[float]] = None
    cognitive_scores: Dict[str, float]
    

class AlertAcknowledgeRequest(BaseModel):
    acknowledged: bool = True


class RecommendationFeedbackRequest(BaseModel):
    helpful: bool
    followed: Optional[bool] = None


# Response schemas
class RiskScoreResponse(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=1.0)
    speech_score: Optional[float] = None
    facial_score: Optional[float] = None
    cognitive_score: Optional[float] = None
    risk_category: RiskCategory
    contributing_factors: List[Dict[str, Any]]
    trend_direction: Optional[str] = None
    comparison_to_baseline: Optional[float] = None


class AssessmentResponse(BaseModel):
    id: str
    user_id: str
    status: AssessmentStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    risk_score: Optional[RiskScoreResponse] = None
    contributing_factors: Optional[List[Dict[str, Any]]] = None
    created_at: datetime


class TrendDataPoint(BaseModel):
    date: datetime
    overall_score: float
    speech_score: Optional[float] = None
    facial_score: Optional[float] = None
    cognitive_score: Optional[float] = None


class TrendResponse(BaseModel):
    user_id: str
    data_points: List[TrendDataPoint]
    trend_direction: str
    trend_percentage: float
    volatility: float


class AlertResponse(BaseModel):
    id: str
    alert_type: AlertType
    title: str
    message: str
    trigger_metrics: Optional[Dict[str, Any]] = None
    acknowledged: bool
    acknowledged_at: Optional[datetime] = None
    created_at: datetime


class RecommendationResponse(BaseModel):
    id: str
    recommendation_type: str
    title: str
    content: str
    action_link: Optional[str] = None
    reasoning: Optional[str] = None
    helpful: Optional[bool] = None
    followed: bool
    created_at: datetime
    expires_at: Optional[datetime] = None


class DashboardSummaryResponse(BaseModel):
    user_id: str
    latest_assessment: Optional[AssessmentResponse] = None
    current_risk_score: Optional[float] = None
    risk_category: Optional[RiskCategory] = None
    weekly_trend: Optional[TrendResponse] = None
    active_alerts: List[AlertResponse]
    pending_recommendations: List[RecommendationResponse]
    assessment_streak_days: int
    next_assessment_due: Optional[datetime] = None
