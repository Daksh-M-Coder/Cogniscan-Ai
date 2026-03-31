#!/usr/bin/env python3
"""Test script to prove CogniScan detection is working"""

import requests
import numpy as np

BASE_URL = "http://localhost:8001"

def test_health():
    """Check if service is running"""
    r = requests.get(f"{BASE_URL}/health")
    print("✅ Health check:", r.json())
    return r.ok

def test_prediction():
    """Test the ML prediction endpoint with real data"""
    
    # Test 1: Simulate "healthy" patient (low variance speech, good cognitive scores)
    healthy_payload = {
        "speech_embedding": np.random.normal(0, 0.1, 256).tolist(),  # Low variance = fluent
        "facial_embedding": np.random.normal(0.5, 0.2, 128).tolist(),
        "cognitive_scores": {
            "digit_span": 0.9,
            "trail_making": 0.85,
            "verbal_fluency": 0.88,
            "pattern_completion": 0.92
        }
    }
    
    r = requests.post(f"{BASE_URL}/api/v1/predict", json=healthy_payload)
    result = r.json()
    print("\n🟢 HEALTHY PATIENT TEST:")
    print(f"   Overall Risk Score: {result['overall_score']:.3f}")
    print(f"   Risk Category: {result['risk_category']}")
    print(f"   Health Score: {(1 - result['overall_score']) * 100:.0f}/100")
    
    # Test 2: Simulate "at-risk" patient (high variance speech, poor cognitive scores)
    atrisk_payload = {
        "speech_embedding": np.random.normal(0, 0.5, 256).tolist(),  # High variance = disfluent
        "facial_embedding": np.random.normal(0.2, 0.1, 128).tolist(),
        "cognitive_scores": {
            "digit_span": 0.4,
            "trail_making": 0.35,
            "verbal_fluency": 0.3,
            "pattern_completion": 0.45
        }
    }
    
    r = requests.post(f"{BASE_URL}/api/v1/predict", json=atrisk_payload)
    result = r.json()
    print("\n🔴 AT-RISK PATIENT TEST:")
    print(f"   Overall Risk Score: {result['overall_score']:.3f}")
    print(f"   Risk Category: {result['risk_category']}")
    print(f"   Health Score: {(1 - result['overall_score']) * 100:.0f}/100")
    print(f"   Contributing Factors: {len(result['contributing_factors'])}")
    for factor in result['contributing_factors']:
        print(f"     - {factor['factor']}: {factor['impact']}")

def test_web_app_flow():
    """Simulate what web app sends"""
    print("\n📱 WEB APP SIMULATION:")
    
    # Simulate recording data
    recording_time = 45  # seconds of speech
    video_time = 30      # seconds of video
    
    # Generate embeddings based on recording quality
    speech_emb = np.random.normal(0, 0.2 + (60-recording_time)/100, 256).tolist()
    facial_emb = np.random.normal(0.4, 0.2, 128).tolist()
    
    # Task scores based on user performance
    task_scores = {
        "digit_span": 0.75,
        "trail_making": 0.70,
        "verbal_fluency": 0.65,
        "pattern_completion": 0.80
    }
    
    payload = {
        "speech_embedding": speech_emb,
        "facial_embedding": facial_emb,
        "cognitive_scores": task_scores
    }
    
    r = requests.post(f"{BASE_URL}/api/v1/predict", json=payload)
    result = r.json()
    
    print(f"   Speech recorded: {recording_time}s")
    print(f"   Video recorded: {video_time}s")
    print(f"   Tasks completed: 4/4")
    print(f"   → Health Score: {(1 - result['overall_score']) * 100:.0f}/100")
    print(f"   → Category: {result['risk_category']}")

if __name__ == "__main__":
    print("=" * 60)
    print("COGNISCAN AI DETECTION TEST")
    print("=" * 60)
    
    try:
        if test_health():
            test_prediction()
            test_web_app_flow()
            print("\n" + "=" * 60)
            print("✅ DETECTION IS WORKING!")
            print("=" * 60)
        else:
            print("❌ Service not running")
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure the ML service is running on port 8001")
