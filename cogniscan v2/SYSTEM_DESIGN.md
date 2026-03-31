# CogniScan AI: Early Detection of Cognitive Decline
## Production-Ready System Design Document

---

# 1. Executive Summary

## Problem Statement
Cognitive decline affects over 55 million people globally, with Alzheimer's disease contributing to 60-70% of cases. Early detection can delay progression by 5-10 years through lifestyle interventions, yet 50% of cases remain undiagnosed until moderate stages. Existing diagnostic methods are expensive, invasive, and inaccessible in low-resource settings.

## Proposed Solution: CogniScan AI
CogniScan AI is a multimodal, AI-powered screening system that detects early signs of cognitive decline through **speech patterns**, **facial micro-expressions**, and **cognitive task performance**—all captured via a smartphone.

## Core Value Proposition
- **Non-invasive screening**: No needles, no clinics, no appointments
- **Privacy-first**: On-device processing for sensitive data
- **Accessible**: Works on low-end Android devices (Android 8+)
- **Actionable**: Real-time alerts and personalized intervention plans

## Innovation Highlights
1. **Tri-modal fusion architecture** combining acoustic, visual, and behavioral biomarkers
2. **Edge-optimized models** (< 50MB total footprint) enabling offline operation
3. **Temporal pattern analysis** detecting subtle changes over weeks, not single snapshots
4. **Adaptive cognitive tasks** that adjust difficulty based on user performance
5. **Explainable AI dashboard** helping caregivers understand risk factors

## Real-World Applicability
- **Primary use case**: Home-based monitoring for adults 50+ with family history
- **Secondary use case**: Rural healthcare worker screening tool in developing nations
- **Tertiary use case**: Assisted living facility continuous monitoring

---

# 2. System Architecture

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  React       │  │  TensorFlow  │  │  MediaPipe   │  │  Local SQLite    │  │
│  │  Native App  │  │  Lite Models │  │  Vision      │  │  Cache           │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
          ┌─────────────────┐ ┌───────────────┐ ┌─────────────────┐
          │ On-Device       │ │  Sync Queue   │ │  Emergency      │
          │ Inference       │ │  (Offline)    │ │  Upload         │
          │ (Edge AI)       │ │               │ │  (Anomaly)      │
          └─────────────────┘ └───────────────┘ └─────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND LAYER (Cloud)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  API Gateway │  │  Node.js     │  │  PostgreSQL  │  │  Redis           │  │
│  │  (Kong/AWS)  │  │  Microservice│  │  + TimescaleDB│  │  Session/Queue   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Python      │  │  S3/Blob     │  │  Notification│  │  Prometheus      │  │
│  │  ML Pipeline │  │  Storage     │  │  Service     │  │  Monitoring      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### Client-Side (Mobile Application)
| Component | Technology | Purpose |
|-----------|-----------|---------|
| UI Framework | React Native (Expo) | Cross-platform iOS/Android |
| State Management | Zustand | Lightweight state |
| Local Storage | SQLite + MMKV | Offline data, settings |
| Audio Capture | Expo AV | Speech recording |
| Video Capture | Expo Camera | Facial capture |
| Edge Inference | TensorFlow Lite | On-device AI |
| Vision Processing | MediaPipe | Face detection, landmarks |

### Backend Services
| Service | Stack | Responsibility |
|---------|-------|---------------|
| API Gateway | Kong/AWS API Gateway | Rate limiting, auth, routing |
| User Service | Node.js + Express | Auth, profiles, preferences |
| Assessment Service | Python + FastAPI | Cognitive test orchestration |
| ML Inference Service | Python + TorchServe | Cloud fallback inference |
| Notification Service | Node.js + Firebase | Push, SMS, email alerts |
| Analytics Service | Python + Pandas | Trend analysis, reporting |

### AI Inference Pipeline
```
Input Capture → Preprocessing → Feature Extraction → Edge Inference → 
Risk Score → Local Cache → Periodic Sync → Cloud Aggregation → 
Trend Analysis → Alert Generation
```

### Data Flow
1. **Capture Phase**: User completes 10-minute daily assessment
2. **Processing Phase**: 
   - Audio → MFCC + Whisper embeddings → Speech model (TFLite)
   - Video → MediaPipe landmarks → Emotion model (TFLite)
   - Tasks → Performance metrics → Cognitive model (TFLite)
3. **Fusion Phase**: Weighted ensemble combines modality scores
4. **Decision Phase**: Risk score + trend analysis → Alert decision
5. **Sync Phase**: Metadata and scores sync to cloud (encrypted)

---

# 3. Multimodal AI Framework

## 3.1 Speech Analysis Module

### Feature Extraction Pipeline
```
Raw Audio (16kHz, 16-bit)
    ↓
┌─────────────────────────────────────────────────────────┐
│ Acoustic Features                                       │
│ • MFCC (13 coefficients)                                │
│ • Prosody: pitch, formants, energy contours             │
│ • Voice quality: jitter, shimmer, HNR                   │
│ • Pause patterns: duration, frequency, location         │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Linguistic Features                                     │
│ • Whisper-base embeddings (temporal)                   │
│ • Vocabulary richness (TTR, MTLD)                      │
│ • Syntactic complexity (dependency depth)               │
│ • Semantic coherence (word2vec similarity)              │
│ • Named entity consistency                              │
└─────────────────────────────────────────────────────────┘
    ↓
Speech Risk Embedding (256-dim)
```

### Biomarkers Detected
| Biomarker | Feature | Clinical Relevance |
|-----------|---------|-------------------|
| Pause duration | > 400ms silent gaps | Word-finding difficulty |
| Speech rate | Words per minute | Cognitive processing speed |
| Pitch variability | F0 standard deviation | Emotional flatness |
| Lexical diversity | Type-token ratio | Vocabulary degradation |
| Syntactic complexity | Mean dependency depth | Grammar simplification |
| Hesitation markers | "um", "uh", repetitions | Retrieval deficits |

### NLP Techniques
- **Acoustic**: OpenSMILE for low-level descriptors
- **Semantic**: Whisper embeddings + cosine similarity for topic coherence
- **Syntactic**: spaCy dependency parsing for tree depth analysis
- **Temporal**: Sliding window analysis (30s segments)

## 3.2 Facial Expression Analysis Module

### Computer Vision Pipeline
```
Video Frame (640x480, 15fps)
    ↓
MediaPipe Face Mesh (468 landmarks)
    ↓
┌─────────────────────────────────────────────────────────┐
│ Geometric Features                                        │
│ • Eye aspect ratio (blink detection)                     │
│ • Mouth corner displacement (smile/frown)              │
│ • Eyebrow position (surprise/concern)                  │
│ • Head pose (orientation, attention)                   │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Appearance Features                                       │
│ • Facial Action Units (AU1-AU45) from OpenFace          │
│ • Micro-expression detection (optical flow)             │
│ • Gaze direction and fixation patterns                  │
│ • Facial asymmetry metrics                              │
└─────────────────────────────────────────────────────────┘
    ↓
Facial Risk Embedding (128-dim)
```

### Emotion Recognition Model
- **Architecture**: MobileNetV2 backbone + custom head
- **Classes**: Neutral, Happy, Sad, Fear, Anger, Surprise, Disgust
- **Output**: Valence-arousal 2D space + emotion probabilities
- **Model size**: 8MB (quantized INT8)

### Micro-Expression Detection
- **Method**: Farneback optical flow between consecutive frames
- **Threshold**: Displacement > 0.5 pixels in AU regions
- **Duration**: 1/25 to 1/5 second (micro-expression range)
- **Significance**: Suppressed emotions may indicate cognitive masking

## 3.3 Cognitive Task Analysis Module

### Task Battery Design
| Task | Domain | Duration | Metrics |
|------|--------|----------|---------|
| Digit Span Forward | Working memory | 2 min | Span length, errors |
| Digit Span Backward | Working memory | 2 min | Span length, errors |
| Trail Making A | Processing speed | 1 min | Completion time, errors |
| Trail Making B | Executive function | 2 min | Completion time, B-A ratio |
| Verbal Fluency | Language/semantic | 1 min | Correct words, perseverations |
| Pattern Completion | Visuospatial | 2 min | Accuracy, response time |

### Performance Scoring
```python
# Composite score calculation
cognitive_score = (
    0.25 * normalize(memory_score) +
    0.25 * normalize(attention_score) +
    0.20 * normalize(executive_score) +
    0.15 * normalize(language_score) +
    0.15 * normalize(visuospatial_score)
)

# Trend detection using exponential moving average
ema_current = α * current_score + (1 - α) * ema_previous
deviation = (ema_current - baseline) / baseline_std
```

## 3.4 Fusion Model

### Architecture: Late Fusion with Attention
```
Speech Embedding (256) ──┐
                          ├──┐
Facial Embedding (128) ───┤  │
                          │  ├── Concatenate (512-dim) ──
Cognitive Embedding (64) ──┤  │                               │
                          ├──┘                               │
Temporal Context (64) ────┘                                  ▼
                                          ┌─────────────────────────┐
                                          │  Multi-Head Attention   │
                                          │  (4 heads, 64-dim)     │
                                          └─────────────────────────┘
                                                          │
                                                          ▼
                                          ┌─────────────────────────┐
                                          │  Feed-Forward Network   │
                                          │  [512, 256, 128, 64, 16]│
                                          │  ReLU + Dropout(0.3)    │
                                          └─────────────────────────┘
                                                          │
                                                          ▼
                                          ┌─────────────────────────┐
                                          │  Risk Classification    │
                                          │  • Low Risk (< 0.3)     │
                                          │  • Mild Risk (0.3-0.6)  │
                                          │  • High Risk (> 0.6)    │
                                          └─────────────────────────┘
```

### Fusion Justification
**Why Attention-based Late Fusion?**
1. **Modality independence**: Each stream processed optimally for its data type
2. **Adaptive weighting**: Attention learns which modalities matter per-instance
3. **Interpretability**: Attention weights reveal contributing factors
4. **Robustness**: Missing modalities handled gracefully (masking)
5. **Scalability**: New modalities added without retraining full network

### Model Specifications
| Attribute | Value |
|-----------|-------|
| Total parameters | 2.1M |
| Quantized size | 12MB |
| Input dimensions | (3, 256) varying per modality |
| Output | 3-class probability + regression score |
| Inference time | 45ms on Snapdragon 865 |

---

# 4. Model Selection & Training

## 4.1 Recommended Architectures

### Speech Model: Custom CNN-BiLSTM
```
Input: (batch, 13, 300)  # 13 MFCCs, 300 frames (~10s)
    ↓
Conv2D(32, 3x3) → BatchNorm → ReLU → MaxPool
    ↓
Conv2D(64, 3x3) → BatchNorm → ReLU → MaxPool
    ↓
Reshape → BiLSTM(128, return_sequences=True)
    ↓
BiLSTM(64)
    ↓
Dense(256) → Speech embedding
```
**Rationale**: CNN captures local spectral patterns, BiLSTM models temporal dynamics

### Facial Model: MobileNetV2 + Custom Head
```
Pre-trained ImageNet weights (frozen)
    ↓
Global Average Pooling
    ↓
Dense(256) → ReLU → Dropout(0.5)
    ↓
Dense(128) → Facial embedding
```
**Rationale**: Transfer learning from ImageNet, efficient for mobile deployment

### Cognitive Model: Tabular Transformer
```
Input: (batch, 15)  # 15 engineered features
    ↓
Feature embedding (15 × 32-dim)
    ↓
Transformer Encoder (2 layers, 4 heads)
    ↓
Flatten → Dense(64) → Cognitive embedding
```
**Rationale**: Handles heterogeneous tabular data, captures feature interactions

### Fusion Model: Attention MLP
- **Attention**: 4 heads, 64-dim per head
- **FFN**: [512, 256, 128, 64, 16] with residual connections
- **Classification**: 3-class softmax
- **Regression**: Sigmoid-activated scalar (0-1 risk score)

## 4.2 Dataset Requirements

### Data Sources
| Dataset | Size | Use Case | License |
|---------|------|----------|---------|
| ADReSS (Alzheimer's) | 150 hours | Speech training | Research |
| Pitt Corpus | 300 sessions | Speech validation | Research |
| AVEC-2019 | 50 hours | Multimodal pretrain | Research |
| Custom Collection | 10,000 sessions | Production fine-tuning | Internal |
| RAF-DB | 30K images | Emotion pretrain | Research |
| FER2013 | 35K images | Emotion validation | Research |

### Data Collection Protocol
1. **Inclusion**: Adults 50+, informed consent, smartphone ownership
2. **Exclusion**: Active psychiatric disorder, acute illness, hearing/vision impairment
3. **Ground truth**: Clinical diagnosis (cognitively normal, MCI, dementia) via MoCA + neurologist
4. **Collection**: 10-minute sessions, weekly for 6 months minimum

### Preprocessing Pipeline

**Audio**:
```python
# 1. Resample to 16kHz
# 2. Voice Activity Detection (webrtcvad)
# 3. Normalization (RMS to -20dB)
# 4. MFCC extraction (13 coeffs, 25ms windows, 10ms hop)
# 5. Delta and delta-delta features
# 6. Truncate/pad to 10 seconds
```

**Video**:
```python
# 1. Face detection (MediaPipe)
# 2. Alignment (eyes to horizontal)
# 3. Crop to 224x224 center face
# 4. Normalize (ImageNet stats)
# 5. Frame sampling (15fps)
```

**Cognitive**:
```python
# 1. Outlier removal (3-sigma rule)
# 2. Min-max normalization per task
# 3. Age/education regression residualization
# 4. Missing value imputation (median)
```

## 4.3 Training Strategy

### Multi-Stage Training
```
Stage 1: Pre-training (2 weeks)
├── Speech: ADReSS + VoxCeleb (self-supervised contrastive)
├── Facial: ImageNet → RAF-DB (supervised transfer)
└── Cognitive: Simulated data + public datasets

Stage 2: Modality Fine-tuning (1 week)
├── Speech: ADReSS supervised classification
├── Facial: AVEC emotion regression
└── Cognitive: Custom labeled dataset

Stage 3: Fusion Training (3 days)
├── Freeze modality encoders
├── Train attention + FFN end-to-end
└── Multi-task: classification + regression

Stage 4: Edge Optimization (1 day)
├── Post-training quantization (INT8)
├── Knowledge distillation (teacher → student)
└── TensorFlow Lite conversion
```

### Loss Functions
```python
# Classification loss
ce_loss = CrossEntropy(predictions, labels)

# Regression loss (risk score)
mse_loss = MSE(predicted_score, true_score)

# Temporal consistency (for video)
temporal_loss = MSE(score_t, score_{t-1}) * λ_temporal

# Total loss
total_loss = 0.6 * ce_loss + 0.3 * mse_loss + 0.1 * temporal_loss
```

### Evaluation Metrics
| Metric | Target | Description |
|--------|--------|-------------|
| Accuracy | > 85% | Overall classification |
| AUC-ROC | > 0.90 | Discrimination ability |
| Sensitivity | > 90% | True positive rate (catch early cases) |
| Specificity | > 80% | True negative rate (avoid false alarms) |
| F1 Score | > 0.85 | Harmonic mean of precision/recall |
| Calibration | Brier < 0.15 | Probability reliability |
| Inference latency | < 100ms | Edge device responsiveness |
| Model size | < 50MB | Storage constraint |

## 4.4 Bias Mitigation

### Identified Risks
| Bias Type | Mitigation Strategy |
|-----------|-------------------|
| Age bias | Stratified sampling across age brackets |
| Gender bias | Balanced dataset, gender-blind features |
| Language bias | Language-specific models, not universal |
| Education bias | Education residualization, separate baselines |
| Socioeconomic | Free app, low-resource optimization |
| Racial/ethnic | Diverse training data, fairness constraints |

### Generalization Strategy
- **Cross-validation**: Leave-one-center-out (for multi-site data)
- **Temporal validation**: Train on 2022 data, test on 2023
- **External validation**: Partner with 3+ hospitals for independent testing
- **Adversarial training**: Domain randomization for device/lighting variance

---

# 5. Application Features

## 5.1 User Onboarding

### Role-Based Access
```
┌─────────────────────────────────────────────────────────────┐
│ Patient Flow (15 min onboarding)                              │
│ 1. Welcome & purpose explanation                              │
│ 2. Informed consent (digital signature)                       │
│ 3. Demographics (age, education, language)                  │
│ 4. Medical history (self-reported conditions)                 │
│ 5. Baseline assessment (3 sessions over 1 week)               │
│ 6. Caregiver invitation (optional)                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Caregiver Flow (5 min onboarding)                           │
│ 1. Invitation link from patient                             │
│ 2. Account creation                                         │
│ 3. Relationship verification                                │
│ 4. Notification preferences                                 │
│ 5. Dashboard tutorial                                       │
└─────────────────────────────────────────────────────────────┘
```

### Tutorial System
- Interactive guided tour for first assessment
- Practice mode with dummy data
- Progress indicators and encouragement
- Help center with FAQ and video guides

## 5.2 Data Capture Interface

### Daily Assessment Flow
```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Start  │───▶│ Speech  │───▶│  Video  │───▶│ Tasks   │───▶│ Review  │
│ Screen  │    │  Task   │    │ Emotion │    │ Battery │    │ Results │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
    │
    ▼
┌─────────┐
│ Progress│
│  Bar    │
└─────────┘
```

### Speech Capture
- **Prompt**: "Tell me about your favorite memory from childhood"
- **Duration**: 60-90 seconds
- **UI**: Visual waveform, countdown timer, re-record option
- **Quality check**: Volume level, background noise detection

### Video Capture
- **Prompt**: "Please look at the camera and react naturally"
- **Duration**: 30 seconds
- **UI**: Face position guide overlay, countdown timer
- **Quality check**: Face detection confirmation, lighting assessment

### Cognitive Tasks
- **Digit Span**: Animated sequence, touch input
- **Trail Making**: Drag-to-connect interface
- **Verbal Fluency**: Voice input with transcription
- **Pattern Completion**: Multiple choice grid

## 5.3 Cognitive Score Dashboard

### Patient View
```
┌─────────────────────────────────────────────────────────────┐
│  Your Cognitive Health                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Overall Score: 78/100  [Trending ▲ +2% this week] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Domains:                                                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │  Memory    │ │ Attention  │ │ Language   │ │ Executive │ │
│  │    82      │ │    75      │ │    80      │ │    75     │ │
│  │  [Stable]  │ │  [▲ +5]    │ │  [▼ -3]    │ │  [Stable] │ │
│  └────────────┘ └────────────┘ └────────────┘ └───────────┘ │
│                                                             │
│  6-Week Trend:                                              │
│  📈 [Line chart showing weekly scores]                      │
│                                                             │
│  Last Assessment: Today, 9:30 AM                           │
│  Next Due: Tomorrow                                         │
└─────────────────────────────────────────────────────────────┘
```

### Caregiver View
```
┌─────────────────────────────────────────────────────────────┐
│  Monitoring: [Patient Name]                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ⚠️  Alert: Declining trend in Language domain      │    │
│  │      Score dropped 12% over 2 weeks                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Recent Activity:                                           │
│  • Assessment completed today                               │
│  • Missed 1 assessment last week                          │
│  • Engagement score: High (85%)                             │
│                                                             │
│  Recommended Actions:                                       │
│  1. Schedule conversation practice                          │
│  2. Review language exercises                               │
│  3. Consider professional consultation                     │
└─────────────────────────────────────────────────────────────┘
```

### Trend Analysis Features
- **Moving averages**: 7-day, 30-day, 90-day windows
- **Anomaly detection**: Z-score > 2 triggers review flag
- **Seasonal adjustment**: Accounts for known patterns
- **Comparison**: Peer group benchmarking (anonymized)

## 5.4 Alert System

### Alert Tiers
| Tier | Trigger | Channels | Response Time |
|------|---------|----------|---------------|
| **Info** | Score change > 5% | In-app notification | Immediate |
| **Warning** | Declining trend (2 weeks) | In-app + Push | 24 hours |
| **Alert** | Risk score > 0.6 | Push + Email + SMS | 1 hour |
| **Critical** | Rapid decline (>20% in 1 week) | All + Emergency contact | 15 minutes |

### Alert Content
```json
{
  "alert_id": "uuid",
  "timestamp": "ISO8601",
  "patient_id": "uuid",
  "severity": "warning",
  "title": "Declining Memory Score",
  "message": "Memory domain score decreased 15% over 2 weeks. Consider scheduling a cognitive assessment.",
  "metrics": {
    "current_score": 65,
    "previous_score": 76,
    "baseline": 80,
    "trend": "declining"
  },
  "recommendations": [
    "Practice daily memory exercises",
    "Ensure 7-8 hours sleep",
    "Schedule healthcare provider visit"
  ],
  "actions": [
    {"label": "View Details", "deeplink": "/dashboard"},
    {"label": "Contact Doctor", "deeplink": "/contacts"}
  ]
}
```

## 5.5 Recommendation Engine

### Rule-Based Foundation
```
IF memory_score < 70 AND trend = declining
THEN recommend: memory_exercises, sleep_hygiene

IF speech_rate < baseline - 20%
THEN recommend: speech_therapy_consult

IF missed_assessments > 2/week
THEN recommend: caregiver_notification, simplified_routine
```

### ML-Based Personalization
- **Collaborative filtering**: Recommendations from similar users
- **Content-based**: Match to user's stated preferences/goals
- **Reinforcement learning**: Optimize for engagement + outcomes

### Recommendation Categories
1. **Cognitive Training**: App-based exercises (Lumosity, Peak integration)
2. **Lifestyle**: Sleep, diet, exercise, social activity
3. **Medical**: Provider visits, medication review
4. **Environmental**: Home safety, routine optimization
5. **Caregiver Support**: Training resources, respite care

---

# 6. Low-Resource Optimization Strategy

## 6.1 Model Compression Techniques

### Quantization
```python
# Post-training quantization (TensorFlow Lite)
converter = tf.lite.TFLiteConverter.from_saved_model(model_path)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_types = [tf.int8]  # INT8 quantization
quantized_model = converter.convert()

# Size reduction: 4x (FP32 → INT8)
# Accuracy impact: < 2% typically
```

### Pruning
```python
# Structured pruning (remove 50% of weights)
import tensorflow_model_optimization as tfmot

pruning_params = {
    'pruning_schedule': tfmot.sparsity.keras.PolynomialDecay(
        initial_sparsity=0.0, final_sparsity=0.5,
        begin_step=0, end_step=100000
    )
}

pruned_model = tfmot.sparsity.keras.prune_low_magnitude(
    model, **pruning_params
)
```

### Knowledge Distillation
```
Teacher Model (Cloud)
    ├── 10M parameters
    ├── 95% accuracy
    └── FP32 inference

    ↓ Distillation

Student Model (Edge)
    ├── 2M parameters
    ├── 92% accuracy
    └── INT8 inference
```

## 6.2 Edge AI Deployment

### TensorFlow Lite Configuration
| Model | Size | Device Target | Latency |
|-------|------|---------------|---------|
| Speech | 18MB | Mid-range | 120ms |
| Facial | 8MB | All devices | 45ms |
| Cognitive | 4MB | All devices | 15ms |
| Fusion | 12MB | Mid-range | 35ms |
| **Total** | **42MB** | - | **215ms** |

### Hardware Acceleration
- **GPU**: Delegate to OpenCL/Vulkan on supported devices
- **NPU**: NNAPI delegate for dedicated AI chips
- **CPU**: ARM NEON optimized kernels (default fallback)

### Dynamic Model Loading
```python
# Load models on-demand, not at startup
def load_model(modality):
    if modality not in loaded_models:
        interpreter = tf.lite.Interpreter(
            model_path=f"{modality}_model.tflite",
            num_threads=2  # Limit CPU usage
        )
        interpreter.allocate_tensors()
        loaded_models[modality] = interpreter
    return loaded_models[modality]

# Unload after inference to free memory
def unload_model(modality):
    if modality in loaded_models:
        del loaded_models[modality]
        gc.collect()
```

## 6.3 Offline Capability Design

### Data Synchronization Strategy
```
┌─────────────────────────────────────────────────────────────┐
│ Online Mode                                                 │
│ • Real-time inference (cloud backup)                       │
│ • Immediate sync to server                                  │
│ • Full feature access                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Offline Mode                                                │
│ • On-device inference only                                 │
│ • Local SQLite queue for data                              │
│ • Limited historical dashboard                            │
│ • Alerts stored locally, delivered on reconnect           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Sync Queue (SQLite)                                         │
│ • Assessment results (encrypted)                          │
│ • Metadata (timestamps, device info)                      │
│ • Retry logic: exponential backoff                        │
│ • Max retry: 10 attempts, then manual review                │
└─────────────────────────────────────────────────────────────┘
```

### Conflict Resolution
- **Server wins**: For assessment data (immutable)
- **Merge**: For user preferences (both apply)
- **Timestamp-based**: For progress tracking

## 6.4 Resource Efficiency

### Memory Management
```
Peak Memory Budget: 150MB
├── App runtime: 40MB
├── Active model: 50MB (loaded on-demand)
├── Input buffers: 30MB (audio + video frames)
├── SQLite cache: 20MB
└── Working memory: 10MB
```

### Battery Optimization
- **Batch processing**: Process multiple frames together
- **Adaptive sampling**: Reduce frequency when stable
- **Low-power mode**: Disable video when battery < 20%
- **Background restrictions**: No inference when app backgrounded

### Network Efficiency
- **Compression**: Brotli for API responses
- **Delta sync**: Only changed data transmitted
- **Priority queue**: Critical alerts bypass batching
- **WiFi preference**: Large uploads (videos) deferred to WiFi

---

# 7. Alert & Recommendation Engine

## 7.1 Alert Mechanisms

### Threshold-Based Alerts
```python
# Static thresholds (calibrated on validation set)
ALERT_THRESHOLDS = {
    'immediate': {'risk_score': 0.8, 'decline_rate': 0.3},
    'urgent': {'risk_score': 0.6, 'decline_rate': 0.2},
    'warning': {'risk_score': 0.5, 'decline_rate': 0.1},
    'info': {'risk_score': 0.4, 'decline_rate': 0.05}
}

def evaluate_alert(current_score, baseline, history):
    decline_rate = (baseline - current_score) / baseline
    
    for level, thresholds in ALERT_THRESHOLDS.items():
        if (current_score >= thresholds['risk_score'] or
            decline_rate >= thresholds['decline_rate']):
            return level
    return None
```

### AI-Driven Anomaly Detection
- **Isolation Forest**: Unsupervised outlier detection on feature space
- **LSTM Autoencoder**: Reconstruction error for temporal anomalies
- **Change Point Detection**: Bayesian online detection (BOCD)

### Escalation Matrix
```
Level 1: System Alert
    ↓ No acknowledgment in 24h
Level 2: Patient Notification (push)
    ↓ No improvement in 48h
Level 3: Caregiver Alert (email/SMS)
    ↓ Critical threshold crossed
Level 4: Emergency Contact (phone)
```

## 7.2 Notification Channels

### Channel Configuration
| Channel | Use Case | User Preference | Rate Limit |
|---------|----------|-----------------|------------|
| In-app | All non-critical | Always on | None |
| Push | Info, Warning | Default on | 5/day |
| Email | Weekly summary, Alerts | Default on | 1/day |
| SMS | Urgent, Critical | Opt-in | 3/week |
| Phone | Critical only | Emergency contacts | As needed |

### Notification Templates

**Info (In-app)**:
> "Your memory score is stable this week. Keep up the good work!"

**Warning (Push)**:
> "CogniScan Alert: Slight decline detected in attention. View details →"

**Urgent (Email + SMS)**:
> "Alert: Risk score increased to 0.65 (High). Recommendation: Schedule healthcare visit. Reply HELP for support."

**Critical (All channels)**:
> "CRITICAL: Rapid decline detected. Emergency contact [Name] has been notified. Call [support number] for assistance."

## 7.3 Recommendation Strategies

### Rule-Based System
```yaml
rules:
  - id: memory_decline
    condition: memory_score < 70 AND trend == declining
    priority: high
    recommendations:
      - type: exercise
        content: "Daily memory game: 15 minutes"
        link: "/exercises/memory"
      - type: lifestyle
        content: "Ensure 7-8 hours sleep tonight"
      - type: medical
        content: "Consider discussing with your doctor"
        link: "/contacts/provider"

  - id: speech_slowing
    condition: speech_rate < baseline * 0.8
    priority: medium
    recommendations:
      - type: exercise
        content: "Conversation practice with family"
      - type: activity
        content: "Reading aloud for 10 minutes daily"
```

### ML-Based Personalization
```python
# Collaborative filtering recommendation
user_similarity = cosine_similarity(user_features, all_users)
similar_users = top_k(user_similarity, k=10)

# Aggregate successful recommendations from similar users
recommendations = aggregate_successful_interventions(similar_users)

# Rank by predicted engagement + outcome
ranked = rank_by_expected_utility(recommendations, user_profile)
```

### Intervention Effectiveness Tracking
- **A/B testing**: Randomize recommendations, measure outcomes
- **Feedback loop**: User rates helpfulness (👍/👎)
- **Outcome correlation**: Link recommendations to score changes
- **Continuous learning**: Update model monthly with new data

---

# 8. Privacy, Security & Ethics

## 8.1 Data Encryption

### Encryption at Rest
```
Patient Data (SQLite)
├── AES-256-GCM encryption (device key)
├── Key stored in: Android Keystore / iOS Keychain
└── Biometric unlock required for access

Cloud Storage (S3/PostgreSQL)
├── Field-level encryption (per-user keys)
├── KMS-managed keys with rotation
└── Separate encryption for PII vs. health data
```

### Encryption in Transit
- **TLS 1.3** for all API communications
- **Certificate pinning** in mobile app
- **Perfect forward secrecy** enabled

### Data Minimization
```python
# Only sync necessary fields
SYNC_WHITELIST = [
    'assessment_id',
    'timestamp',
    'risk_score',
    'domain_scores',  # Aggregated, not raw
    'alert_triggers',
    'device_metadata'  # For quality control
]

# Raw audio/video never leaves device
# Only embeddings and metadata sync to cloud
```

## 8.2 Consent Management

### Tiered Consent Model
```
┌─────────────────────────────────────────────────────────────┐
│ Level 1: Core Functionality                                 │
│ • Assessments stored locally                                │
│ • Basic trend analysis                                      │
│ • No cloud sync                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Level 2: Enhanced Insights (Opt-in)                       │
│ • Cloud sync for cross-device access                       │
│ • Advanced analytics                                        │
│ • Caregiver sharing                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Level 3: Research Contribution (Separate opt-in)           │
│ • Anonymized data for model improvement                    │
│ • Aggregate statistics only                                 │
│ • Revocable at any time                                     │
└─────────────────────────────────────────────────────────────┘
```

### Consent UI
- Clear plain-language explanations
- Granular toggles per data type
- Visual indicators of consent status
- One-click revocation

## 8.3 Healthcare Compliance

### HIPAA Compliance (US)
- **Business Associate Agreements** with all vendors
- **Audit logging** of all data access
- **Minimum necessary** standard for data sharing
- **Breach notification** procedures (< 60 days)

### GDPR Compliance (EU)
- **Right to erasure**: Complete data deletion within 30 days
- **Data portability**: Export in machine-readable format
- **Consent records**: Maintained with timestamps
- **DPO contact**: Published in privacy policy

### Other Regulations
- **FDA**: Currently enforcement discretion for wellness apps
- **MDR (EU)**: Class I medical device pathway if claiming diagnosis
- **Health Canada**: Medical device license if therapeutic claims

## 8.4 AI Explainability

### Feature Importance
```python
# SHAP values for each prediction
shap_values = explainer.shap_values(input_features)

# Present top contributing factors
top_features = [
    {"factor": "Speech pause duration", "impact": "+15% risk", "direction": "increase"},
    {"factor": "Memory task accuracy", "impact": "-10% risk", "direction": "decrease"},
    {"factor": "Facial expression variability", "impact": "+8% risk", "direction": "increase"}
]
```

### Dashboard Explanation
```
Your risk score: 0.62 (Moderate)

Why this score?
┌────────────────────────────────────────────────┐
│ 📊 Speech Analysis                             │
│    • Pause duration: Higher than usual (+15%) │
│    • Speech rate: Normal                      │
│    [View details →]                            │
├────────────────────────────────────────────────┤
│ 😊 Facial Expression                           │
│    • Expression range: Reduced (+8%)        │
│    • Attention: Normal                        │
│    [View details →]                            │
├────────────────────────────────────────────────┤
│ 🧠 Cognitive Tasks                             │
│    • Memory accuracy: Below average (-10%)   │
│    • Processing speed: Normal                 │
│    [View details →]                            │
└────────────────────────────────────────────────┘

This score compares your recent assessments to your baseline.
A score above 0.6 suggests discussing results with a healthcare provider.
```

### Clinical Validation
- Model trained on clinically-diagnosed populations
- Performance validated against MoCA scores
- Regular calibration with new clinical data
- Confidence intervals on all predictions

---

# 9. Technology Stack

## 9.1 Frontend Development

### Mobile Application
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React Native (Expo) | Cross-platform development |
| Navigation | React Navigation | Screen routing |
| State | Zustand | Lightweight state management |
| UI Components | React Native Paper | Material Design |
| Charts | Victory Native | Trend visualizations |
| Storage | MMKV + SQLite | Local data persistence |
| Audio | Expo AV | Recording, playback |
| Camera | Expo Camera | Video capture |

### Web Dashboard (Caregiver Portal)
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 |
| Styling | TailwindCSS |
| Components | shadcn/ui |
| Charts | Recharts |
| State | React Query |

## 9.2 Backend Infrastructure

### Core Services
| Service | Technology | Hosting |
|---------|-----------|---------|
| API Gateway | Kong / AWS API Gateway | AWS |
| Auth Service | Node.js + Passport.js | ECS/Fargate |
| Assessment API | Python + FastAPI | ECS/Fargate |
| Notification | Node.js + Firebase | Lambda |
| ML Inference | Python + TorchServe | SageMaker |

### Database Layer
| Data Type | Technology | Purpose |
|-----------|-----------|---------|
| User data | PostgreSQL 15 | Profiles, auth |
| Time-series | TimescaleDB | Assessment scores |
| Cache | Redis 7 | Sessions, rate limiting |
| Queue | Redis + Bull | Async job processing |
| Search | Elasticsearch | Log analysis |
| Object Store | S3 | Encrypted backups |

### DevOps & Infrastructure
| Component | Tool |
|-----------|------|
| IaC | Terraform |
| CI/CD | GitHub Actions |
| Containers | Docker + ECR |
| Orchestration | ECS + Fargate |
| Monitoring | Datadog / Grafana |
| Logging | CloudWatch + ELK |
| Alerting | PagerDuty |

## 9.3 AI/ML Development

### Model Development
| Component | Tool |
|-----------|------|
| Framework | TensorFlow 2.15, PyTorch 2.1 |
| Experiment tracking | Weights & Biases |
| Notebook | Jupyter + Colab |
| Data versioning | DVC |
| Model registry | MLflow |

### Edge Deployment
| Component | Tool |
|-----------|------|
| Conversion | TensorFlow Lite |
| Optimization | ONNX Runtime |
| Benchmarking | TensorFlow Model Benchmark |
| Testing | Firebase Test Lab |

### Key Libraries
```python
# Audio processing
librosa, opensmile, webrtcvad

# Computer vision
mediapipe, opencv-python, PIL

# NLP
transformers, spacy, nltk

# ML utilities
scikit-learn, numpy, pandas

# Deep learning
tensorflow, torch, keras

# Explainability
shap, lime, eli5
```

## 9.4 Deployment & Scaling

### Production Architecture
```
┌─────────────────────────────────────────────────────────────┐
│ CloudFront CDN                                              │
│ ├── Static assets (React bundle)                           │
│ └── API caching (GET requests)                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ API Gateway (Kong/AWS)                                      │
│ ├── Rate limiting: 100 req/min per user                    │
│ ├── Authentication: JWT validation                         │
│ └── Routing to microservices                               │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌─────────┐   ┌─────────┐   ┌─────────┐
        │  User   │   │Assessment│   │   ML    │
        │ Service │   │ Service │   │ Service │
        └─────────┘   └─────────┘   └─────────┘
              │             │             │
              └─────────────┼─────────────┘
                            ▼
              ┌─────────────────────────────┐
              │      PostgreSQL +         │
              │      TimescaleDB          │
              │  (Multi-AZ, encrypted)    │
              └─────────────────────────────┘
```

### Scaling Strategy
| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU | > 70% for 5min | Scale out +1 task |
| Memory | > 80% for 5min | Scale out +1 task |
| Queue depth | > 1000 jobs | Scale workers +2 |
| Error rate | > 1% for 2min | Alert on-call |
| Latency | P95 > 500ms | Review, consider cache |

---

# 10. Evaluation Metrics

## 10.1 Model Performance

### Classification Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Accuracy | ≥ 85% | (TP + TN) / Total |
| Sensitivity | ≥ 90% | TP / (TP + FN) |
| Specificity | ≥ 80% | TN / (TN + FP) |
| PPV (Precision) | ≥ 80% | TP / (TP + FP) |
| NPV | ≥ 90% | TN / (TN + FN) |
| F1 Score | ≥ 0.85 | 2 × (Precision × Recall) / (Precision + Recall) |
| AUC-ROC | ≥ 0.90 | Area under ROC curve |
| AUC-PR | ≥ 0.85 | Area under precision-recall curve |

### Regression Metrics (Risk Score)
| Metric | Target | Description |
|--------|--------|-------------|
| MAE | < 0.10 | Mean absolute error |
| RMSE | < 0.15 | Root mean squared error |
| R² | > 0.70 | Coefficient of determination |
| Calibration | Brier < 0.15 | Probability calibration |

### Temporal Metrics
| Metric | Target | Description |
|--------|--------|-------------|
| Early detection rate | > 70% | Detection 6+ months before diagnosis |
| False alarm rate | < 20% | Alerts without subsequent decline |
| Time to alert | < 2 weeks | From decline start to notification |

## 10.2 System Performance

### Latency Benchmarks
| Operation | Target | Max Acceptable |
|-----------|--------|---------------|
| Edge inference | < 250ms | 500ms |
| Cloud inference | < 500ms | 1000ms |
| API response | < 200ms | 500ms |
| App launch | < 3s | 5s |
| Assessment flow | < 15min total | 20min |

### Resource Efficiency
| Metric | Target | Measurement |
|--------|--------|-------------|
| App size | < 80MB | APK/IPA size |
| Memory usage | < 150MB | Peak RAM |
| Battery impact | < 5%/assessment | Battery drain |
| Storage growth | < 10MB/week | Local cache |
| Network usage | < 50MB/week | Sync traffic |

## 10.3 User Engagement

| Metric | Target | Calculation |
|--------|--------|-------------|
| Daily active users (DAU) | > 60% of MAU | DAU / MAU |
| Assessment completion rate | > 85% | Completed / Started |
| 7-day retention | > 70% | Return after 7 days |
| 30-day retention | > 50% | Return after 30 days |
| Caregiver activation | > 80% | Linked / Invited |
| Alert acknowledgment | > 90% | Viewed / Sent |
| Recommendation adherence | > 40% | Followed / Recommended |
| NPS score | > 50 | Survey responses |

## 10.4 Clinical Outcomes

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Clinical correlation | r > 0.70 | Correlation with MoCA |
| Sensitivity (early stage) | > 80% | Detection of MCI |
| Physician referral rate | > 30% | Users with professional visit |
| Intervention effectiveness | > 15% improvement | Score change with adherence |
| User satisfaction | > 4.0/5 | In-app survey |

## 10.5 Testing Strategy

### Automated Testing
```
Unit Tests (Jest + Pytest)
├── Coverage target: 80%
├── Run on every PR
└── Block merge if failing

Integration Tests (Cypress + Postman)
├── API contract validation
├── E2E critical paths
└── Run nightly

Model Tests (pytest)
├── Performance regression
├── Bias detection
└── Edge case handling
```

### Manual Testing
- **QA team**: Regression testing weekly
- **Beta program**: 100 users, 2-week cycles
- **Clinical validation**: Partner hospital testing
- **Accessibility**: Screen reader, colorblind testing

### Load Testing
- **Target**: 10,000 concurrent users
- **Tools**: k6, Artillery
- **Scenarios**: Peak morning assessments, sync storms
- **Success criteria**: P95 latency < 500ms, 0% errors

---

# 11. Expected Impact

## 11.1 Healthcare Benefits

### Early Detection
- **Problem**: 50% of dementia cases diagnosed at moderate+ stage
- **Impact**: Detect MCI 6-12 months earlier through continuous monitoring
- **Outcome**: Earlier intervention, delayed progression by 2-5 years

### Cost Reduction
| Cost Category | Current | With CogniScan | Savings |
|--------------|---------|----------------|---------|
| Diagnostic workup | $3,000 | $500 (app + targeted tests) | 83% |
| Emergency interventions | $15,000/year | $8,000/year (early management) | 47% |
| Caregiver burden | 20 hrs/week | 15 hrs/week (better planning) | 25% |
| **Total per patient** | **$18,000** | **$8,500** | **53%** |

### Care Quality
- **Continuous monitoring** vs. annual screenings
- **Objective biomarkers** vs. subjective reports
- **Trend tracking** vs. single-point assessments
- **Personalized recommendations** vs. generic advice

## 11.2 Societal Benefits

### Accessibility
| Population | Barrier | CogniScan Solution |
|------------|---------|-------------------|
| Rural areas | No neurologist | Smartphone-based screening |
| Low-income | Cost | Free tier with essential features |
| Elderly | Technology complexity | Simplified UI, voice guidance |
| Non-English | Language | Multilingual support (Phase 2) |
| Disabled | Mobility | Home-based assessment |

### Scale Potential
- **Global addressable market**: 900M adults 50+ worldwide
- **Serviceable market**: 150M with risk factors
- **Target penetration**: 5% in 5 years = 7.5M users
- **Geographic focus**: North America, EU, East Asia initially

## 11.3 Economic Impact

### Healthcare System
- **Reduced specialist burden**: Screen at primary care level
- **Optimized resource allocation**: Focus on high-risk patients
- **Research acceleration**: Aggregate data for studies

### Family Impact
- **Reduced caregiver stress**: Early warning, time to prepare
- **Financial planning**: Advance notice for care arrangements
- **Quality time**: Focus on meaningful activities vs. crisis management

---

# 12. Future Enhancements

## 12.1 Wearable Integration

### Device Support
| Device | Data | Biomarkers |
|--------|------|-----------|
| Apple Watch | HR, HRV, sleep | Stress, sleep quality |
| Fitbit | Activity, sleep | Physical decline proxy |
| Oura Ring | Sleep, temperature | Sleep architecture |
| EEG headband | Brain activity | Cognitive load patterns |

### New Modalities
- **Sleep analysis**: Sleep architecture disruption correlation
- **Activity patterns**: Routine regularity as cognitive proxy
- **Physiological**: Heart rate variability under cognitive load
- **Gait analysis**: Walking pattern changes (via phone sensors)

## 12.2 Multilingual Support

### Language Pipeline
```
Current: English only
    ↓
Phase 1: Spanish, Mandarin, Hindi (top 3 by user count)
    ↓
Phase 2: French, German, Japanese, Arabic
    ↓
Phase 3: 20 languages covering 80% of target population
```

### Speech Model Adaptation
- **Acoustic**: Language-specific phoneme models
- **Linguistic**: Multilingual BERT embeddings
- **Semantic**: Cross-lingual transfer learning

## 12.3 Telemedicine Integration

### Integration Points
```
┌─────────────────────────────────────────────────────────────┐
│ CogniScan AI                                                │
│ ├── Risk score > 0.7                                         │
│ └── Trigger: Telemedicine referral                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Telemedicine Platform (Teladoc, Amwell, etc.)              │
│ ├── Priority scheduling for flagged patients                │
│ ├── Pre-visit data package (trends, scores)                │
│ └── Post-visit outcome recording                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Electronic Health Records (Epic, Cerner)                    │
│ ├── Biomarker history in patient chart                      │
│ └── Alert to primary care provider                        │
└─────────────────────────────────────────────────────────────┘
```

### Features
- **One-click appointment**: From alert to scheduling
- **Data sharing**: Patient-controlled provider access
- **Outcome tracking**: Post-visit score correlation
- **Provider dashboard**: Population health view

## 12.4 Continuous Learning System

### Federated Learning
```python
# Privacy-preserving model updates
for round in training_rounds:
    global_model = server.get_model()
    
    for device in selected_devices:
        local_update = device.train(global_model, local_data)
        encrypted_update = encrypt(local_update)
        server.submit(encrypted_update)
    
    aggregated = secure_aggregate(server.updates)
    global_model = server.update(aggregated)
```

### Benefits
- **Privacy**: Raw data never leaves device
- **Scale**: Learn from millions of users
- **Personalization**: Adapt to individual patterns
- **Freshness**: Monthly model updates

### Implementation
- **Secure aggregation**: Cryptographic protocols
- **Differential privacy**: Noise addition for privacy
- **Model compression**: Efficient update transmission
- **Quality control**: Validation before deployment

## 12.5 Advanced Analytics

### Population Health
- **Geographic trends**: Regional risk patterns
- **Demographic insights**: Age/gender/education correlations
- **Intervention effectiveness**: What works, for whom
- **Predictive modeling**: Population-level forecasting

### Research Platform
- **Cohort discovery**: Identify eligible participants
- **Real-world evidence**: Natural history data
- **Clinical trial support**: Recruitment, monitoring
- **Publication pipeline**: Peer-reviewed validation

---

# Appendix: Technical Specifications Summary

## Model Zoo
| Model | Size | Latency | Accuracy | Purpose |
|-------|------|---------|----------|---------|
| Speech CNN-BiLSTM | 18MB | 120ms | 88% | Acoustic biomarkers |
| Facial MobileNetV2 | 8MB | 45ms | 85% | Emotion/micro-expression |
| Cognitive Transformer | 4MB | 15ms | 91% | Task performance |
| Fusion Attention | 12MB | 35ms | 89% | Combined risk score |
| **Total Footprint** | **42MB** | **215ms** | **87%** | **Complete system** |

## API Endpoints
| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| /api/v1/auth/login | POST | User authentication | None |
| /api/v1/assessments | POST | Submit assessment | JWT |
| /api/v1/assessments/:id | GET | Retrieve results | JWT |
| /api/v1/trends | GET | Score history | JWT |
| /api/v1/alerts | GET | Active alerts | JWT |
| /api/v1/recommendations | GET | Personalized recs | JWT |
| /api/v1/caregivers | POST | Link caregiver | JWT |
| /api/v1/health | GET | System status | API key |

## Resource Requirements
| Component | Min | Recommended |
|-----------|-----|-------------|
| Client device | Android 8 / iOS 14 | Android 12 / iOS 16 |
| Client RAM | 2GB | 4GB |
| Client storage | 100MB free | 500MB free |
| Server (per 10k users) | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM |
| Database (per 100k users) | 100GB | 500GB |

---

*Document Version: 1.0*
*Last Updated: March 2026*
*Classification: Technical Specification*
