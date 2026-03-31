from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np

from src.schemas import RiskCategory
from src.models import Assessment


class RiskCalculator:
    """Fallback risk calculation when ML service unavailable"""
    
    def __init__(self):
        self.weights = {
            "speech": 0.35,
            "facial": 0.25,
            "cognitive": 0.40
        }
    
    def calculate_fallback(self, request) -> Dict[str, Any]:
        """Calculate risk score using rule-based approach"""
        
        scores = {}
        
        # Speech score from embedding statistics
        if request.speech_embedding:
            # Use embedding variance as proxy for coherence
            emb_array = np.array(request.speech_embedding)
            scores["speech"] = min(1.0, np.std(emb_array) * 2)
        else:
            scores["speech"] = 0.5
        
        # Facial score from embedding
        if request.facial_embedding:
            emb_array = np.array(request.facial_embedding)
            scores["facial"] = min(1.0, np.mean(emb_array) + 0.5)
        else:
            scores["facial"] = 0.5
        
        # Cognitive score from task performance
        if request.cognitive_scores:
            avg_score = np.mean(list(request.cognitive_scores.values()))
            # Invert: higher task score = lower risk
            scores["cognitive"] = max(0.0, 1.0 - avg_score)
        else:
            scores["cognitive"] = 0.5
        
        # Weighted fusion
        overall = (
            self.weights["speech"] * scores["speech"] +
            self.weights["facial"] * scores["facial"] +
            self.weights["cognitive"] * scores["cognitive"]
        )
        
        # Determine category
        if overall < 0.3:
            category = RiskCategory.LOW
        elif overall < 0.5:
            category = RiskCategory.MILD
        elif overall < 0.7:
            category = RiskCategory.HIGH
        else:
            category = RiskCategory.CRITICAL
        
        # Generate contributing factors
        factors = []
        if scores["speech"] > 0.6:
            factors.append({
                "factor": "Speech patterns",
                "impact": f"+{int((scores['speech'] - 0.5) * 100)}%",
                "direction": "increase"
            })
        if scores["cognitive"] > 0.6:
            factors.append({
                "factor": "Cognitive task performance",
                "impact": f"+{int((scores['cognitive'] - 0.5) * 100)}%",
                "direction": "increase"
            })
        
        return {
            "overall_score": overall,
            "speech_score": scores["speech"],
            "facial_score": scores["facial"],
            "cognitive_score": scores["cognitive"],
            "risk_category": category.value,
            "contributing_factors": factors
        }


class TrendAnalyzer:
    """Analyze cognitive trends over time"""
    
    def analyze(self, assessments: List[Assessment]) -> Dict[str, Any]:
        """Analyze trend from assessment history"""
        
        scores = [a.overall_risk_score for a in assessments if a.overall_risk_score]
        
        if len(scores) < 2:
            return {
                "direction": "stable",
                "percentage_change": 0.0,
                "volatility": 0.0
            }
        
        # Linear regression for trend
        x = np.arange(len(scores))
        slope = np.polyfit(x, scores, 1)[0]
        
        # Calculate percentage change
        pct_change = ((scores[-1] - scores[0]) / scores[0]) * 100 if scores[0] > 0 else 0
        
        # Calculate volatility (std dev of daily changes)
        changes = np.diff(scores)
        volatility = float(np.std(changes)) if len(changes) > 0 else 0
        
        # Determine direction
        if slope > 0.01:
            direction = "increasing"
        elif slope < -0.01:
            direction = "decreasing"
        else:
            direction = "stable"
        
        return {
            "direction": direction,
            "percentage_change": float(pct_change),
            "volatility": float(volatility)
        }
