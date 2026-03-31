-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Users table (reference, primarily managed by user-service)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    speech_recording_url TEXT,
    video_recording_url TEXT,
    
    speech_features JSONB,
    facial_features JSONB,
    cognitive_task_scores JSONB,
    
    speech_risk_score FLOAT,
    facial_risk_score FLOAT,
    cognitive_risk_score FLOAT,
    
    overall_risk_score FLOAT,
    risk_category VARCHAR(20),
    
    contributing_factors JSONB,
    
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    
    synced_to_edge BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert assessments to hypertable for time-series optimization
SELECT create_hypertable('assessments', 'created_at', if_not_exists => TRUE);

-- Indexes
CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_risk_score ON assessments(overall_risk_score);
CREATE INDEX idx_assessments_created_at ON assessments(created_at DESC);

-- Cognitive baseline table
CREATE TABLE IF NOT EXISTS cognitive_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    baseline_speech_score FLOAT,
    baseline_facial_score FLOAT,
    baseline_cognitive_score FLOAT,
    baseline_overall_score FLOAT,
    
    baseline_speech_features JSONB,
    baseline_facial_features JSONB,
    baseline_cognitive_features JSONB,
    
    score_std_dev FLOAT,
    
    established_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
    
    alert_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    trigger_metrics JSONB,
    
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    
    channels_sent VARCHAR(20)[],
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    recommendation_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    action_link VARCHAR(500),
    
    reasoning TEXT,
    
    helpful BOOLEAN,
    feedback_at TIMESTAMPTZ,
    followed BOOLEAN DEFAULT FALSE,
    followed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_followed ON recommendations(followed);

-- Continuous aggregates for analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_risk_summary
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', created_at) AS day,
    user_id,
    AVG(overall_risk_score) as avg_risk_score,
    COUNT(*) as assessment_count
FROM assessments
WHERE status = 'completed'
GROUP BY day, user_id;

-- Refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('daily_risk_summary',
    start_offset => INTERVAL '1 month',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_baselines_updated_at BEFORE UPDATE ON cognitive_baselines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
