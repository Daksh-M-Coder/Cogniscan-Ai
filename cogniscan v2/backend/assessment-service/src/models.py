from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey, Text, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from src.database import Base


class User(Base):
    """User model (reference only - managed by user-service)"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String(255), unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    assessments = relationship("Assessment", back_populates="user")
    cognitive_baseline = relationship("CognitiveBaseline", back_populates="user", uselist=False)


class Assessment(Base):
    """Assessment session model"""
    __tablename__ = "assessments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    
    # Assessment data
    speech_recording_url = Column(Text)
    video_recording_url = Column(Text)
    
    # Raw scores from each modality
    speech_features = Column(JSON)
    facial_features = Column(JSON)
    cognitive_task_scores = Column(JSON)
    
    # Computed risk scores
    speech_risk_score = Column(Float)
    facial_risk_score = Column(Float)
    cognitive_risk_score = Column(Float)
    
    # Fusion result
    overall_risk_score = Column(Float, index=True)
    risk_category = Column(String(20))  # low, mild, high, critical
    
    # Explainability
    contributing_factors = Column(JSON)
    
    # Status
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    error_message = Column(Text)
    
    # Sync status
    synced_to_edge = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="assessments")
    alerts = relationship("Alert", back_populates="assessment")


class CognitiveBaseline(Base):
    """User's cognitive baseline for comparison"""
    __tablename__ = "cognitive_baselines"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Baseline scores (established after 3 initial assessments)
    baseline_speech_score = Column(Float)
    baseline_facial_score = Column(Float)
    baseline_cognitive_score = Column(Float)
    baseline_overall_score = Column(Float)
    
    # Feature baselines
    baseline_speech_features = Column(JSON)
    baseline_facial_features = Column(JSON)
    baseline_cognitive_features = Column(JSON)
    
    # Computed statistics
    score_std_dev = Column(Float)
    
    established_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="cognitive_baseline")


class Alert(Base):
    """Alert model for notifications"""
    __tablename__ = "alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=True)
    
    # Alert details
    alert_type = Column(String(50))  # info, warning, alert, critical
    title = Column(String(255))
    message = Column(Text)
    
    # Metrics that triggered alert
    trigger_metrics = Column(JSON)
    
    # Status
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime(timezone=True))
    
    # Notification tracking
    channels_sent = Column(ARRAY(String))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    assessment = relationship("Assessment", back_populates="alerts")


class Recommendation(Base):
    """Recommendation model"""
    __tablename__ = "recommendations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    recommendation_type = Column(String(50))  # exercise, lifestyle, medical, environmental
    title = Column(String(255))
    content = Column(Text)
    action_link = Column(String(500))
    
    # AI-generated explanation
    reasoning = Column(Text)
    
    # User feedback
    helpful = Column(Boolean)
    feedback_at = Column(DateTime(timezone=True))
    followed = Column(Boolean, default=False)
    followed_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
