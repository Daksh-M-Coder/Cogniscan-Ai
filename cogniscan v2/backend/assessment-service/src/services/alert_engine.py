from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from src.models import Assessment, Alert, Recommendation, CognitiveBaseline
from src.schemas import AlertType
from src.config import get_settings

settings = get_settings()


class AlertEngine:
    """Engine for evaluating and creating alerts"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.thresholds = {
            "critical": {"score": settings.ALERT_THRESHOLD_CRITICAL, "decline": 0.3},
            "alert": {"score": settings.ALERT_THRESHOLD_HIGH, "decline": 0.2},
            "warning": {"score": settings.ALERT_THRESHOLD_WARNING, "decline": 0.1},
        }
    
    async def evaluate_and_create_alerts(self, user_id: str, assessment: Assessment):
        """Evaluate assessment and create alerts if needed"""
        
        score = assessment.overall_risk_score
        
        # Get baseline for comparison
        baseline_query = select(CognitiveBaseline).where(
            CognitiveBaseline.user_id == user_id
        )
        baseline_result = await self.db.execute(baseline_query)
        baseline = baseline_result.scalar_one_or_none()
        
        # Calculate decline from baseline if available
        decline_rate = 0
        if baseline and baseline.baseline_overall_score:
            decline_rate = (score - baseline.baseline_overall_score) / baseline.baseline_overall_score
        
        # Determine alert level
        alert_level = None
        for level, thresh in self.thresholds.items():
            if score >= thresh["score"] or decline_rate >= thresh["decline"]:
                alert_level = level
                break
        
        if alert_level:
            await self._create_alert(user_id, assessment, alert_level, score, decline_rate)
    
    async def _create_alert(
        self,
        user_id: str,
        assessment: Assessment,
        level: str,
        score: float,
        decline_rate: float
    ):
        """Create alert record"""
        
        alert_configs = {
            "critical": {
                "type": AlertType.CRITICAL,
                "title": "Critical Cognitive Decline Detected",
                "message": f"Risk score is critically high ({score:.2f}). Immediate medical consultation recommended."
            },
            "alert": {
                "type": AlertType.ALERT,
                "title": "High Risk Score Alert",
                "message": f"Your risk score has increased to {score:.2f}. Consider scheduling a healthcare visit."
            },
            "warning": {
                "type": AlertType.WARNING,
                "title": "Declining Trend Detected",
                "message": f"Your cognitive scores show a declining trend. Review recommendations for preventive actions."
            }
        }
        
        config = alert_configs.get(level, alert_configs["warning"])
        
        alert = Alert(
            user_id=user_id,
            assessment_id=assessment.id,
            alert_type=config["type"].value,
            title=config["title"],
            message=config["message"],
            trigger_metrics={
                "risk_score": score,
                "decline_rate": decline_rate,
                "baseline_comparison": decline_rate
            }
        )
        
        self.db.add(alert)
    
    async def generate_recommendations(self, user_id: str, assessment: Assessment):
        """Generate personalized recommendations based on assessment"""
        
        recommendations = []
        
        # Check specific domain scores
        if assessment.cognitive_risk_score and assessment.cognitive_risk_score > 0.5:
            recommendations.append({
                "type": "exercise",
                "title": "Daily Memory Exercise",
                "content": "Spend 15 minutes on memory training games to strengthen cognitive function.",
                "action_link": "/exercises/memory",
                "reasoning": "Your cognitive task scores indicate room for improvement. Regular practice can help maintain cognitive function."
            })
        
        if assessment.speech_risk_score and assessment.speech_risk_score > 0.5:
            recommendations.append({
                "type": "activity",
                "title": "Conversation Practice",
                "content": "Engage in daily conversations with family or friends. Reading aloud for 10 minutes can also help.",
                "reasoning": "Speech pattern analysis suggests benefits from increased verbal engagement."
            })
        
        if assessment.facial_risk_score and assessment.facial_risk_score > 0.5:
            recommendations.append({
                "type": "lifestyle",
                "title": "Social Engagement",
                "content": "Increase social activities and face-to-face interactions. Emotional expression is linked to cognitive health.",
                "reasoning": "Facial expression analysis suggests increased social engagement may be beneficial."
            })
        
        # General recommendations for all users
        recommendations.append({
            "type": "lifestyle",
            "title": "Sleep Quality",
            "content": "Aim for 7-8 hours of quality sleep. Consistent sleep patterns support cognitive health.",
            "reasoning": "Sleep is essential for memory consolidation and cognitive function maintenance."
        })
        
        # Save recommendations
        for rec in recommendations:
            recommendation = Recommendation(
                user_id=user_id,
                recommendation_type=rec["type"],
                title=rec["title"],
                content=rec["content"],
                action_link=rec.get("action_link"),
                reasoning=rec["reasoning"],
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            self.db.add(recommendation)
