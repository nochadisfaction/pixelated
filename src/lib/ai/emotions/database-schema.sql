-- Emotion Analysis Database Schema
-- This schema provides tables for storing emotion analysis data,
-- user emotional baselines, and historical emotional data

-- Enable RLS for secure access control
ALTER DATABASE CURRENT SET ENABLE_ROW_LEVEL_SECURITY = ON;

-- Create emotions extension for enhanced emotion processing (if available)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For fuzzy text matching
-- CREATE EXTENSION IF NOT EXISTS vector;  -- For vector operations (if using embeddings)

-- Emotion Analysis Results Table
CREATE TABLE IF NOT EXISTS emotion_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_type TEXT NOT NULL, -- 'text', 'speech', 'multimodal'
  content_reference TEXT, -- Reference to the analyzed content (e.g., message ID)

  -- Core emotion data (JSONB for flexibility)
  emotions JSONB NOT NULL, -- Array of emotions with type, confidence, intensity
  overall_sentiment REAL NOT NULL, -- -1 to 1 scale

  -- Optional components
  risk_factors JSONB, -- Potential risk factors detected
  contextual_factors JSONB, -- Contextual factors affecting emotion
  requires_attention BOOLEAN DEFAULT FALSE,

  -- Metadata
  analysis_version TEXT, -- Version of the analysis algorithm used
  normalized BOOLEAN DEFAULT FALSE, -- Whether this analysis is normalized
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Indexes
  CONSTRAINT valid_sentiment CHECK (overall_sentiment >= -1 AND overall_sentiment <= 1)
);

-- Index for efficient user-based queries
CREATE INDEX IF NOT EXISTS emotion_analyses_user_id_idx ON emotion_analyses(user_id);
CREATE INDEX IF NOT EXISTS emotion_analyses_recorded_at_idx ON emotion_analyses(recorded_at);
CREATE INDEX IF NOT EXISTS emotion_analyses_requires_attention_idx ON emotion_analyses(requires_attention) WHERE requires_attention = TRUE;

-- Dimensional Emotion Mappings Table
CREATE TABLE IF NOT EXISTS dimensional_emotion_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES emotion_analyses(id) ON DELETE CASCADE,

  -- Dimensional mapping data
  primary_vector JSONB NOT NULL, -- Primary emotion vector (valence, arousal, dominance)
  emotion_vectors JSONB NOT NULL, -- Array of individual emotion vectors
  quadrant TEXT NOT NULL, -- Emotional quadrant label
  intensity REAL NOT NULL, -- Overall emotional intensity (0-1)
  dimensional_distribution JSONB NOT NULL, -- Distribution across dimensions
  dominant_dimensions JSONB NOT NULL, -- Array of dominant dimensions

  -- Metadata
  mapping_version TEXT, -- Version of the mapping algorithm
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_intensity CHECK (intensity >= 0 AND intensity <= 1)
);

-- Emotional Baselines Table
CREATE TABLE IF NOT EXISTS emotional_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Baseline data
  typical_emotional_state JSONB NOT NULL, -- Typical emotional state data
  adjustment_factors JSONB, -- Personalization adjustment factors
  confidence_score REAL NOT NULL, -- Confidence in the baseline (0-1)
  data_point_count INTEGER NOT NULL, -- Number of data points used

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1),
  CONSTRAINT valid_data_points CHECK (data_point_count > 0),

  -- Only one active baseline per user
  UNIQUE (user_id)
);

-- Baseline Personalization Parameters Table
CREATE TABLE IF NOT EXISTS baseline_personalization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personalization data
  demographics JSONB, -- Age, gender, culture, language
  personal_factors JSONB, -- Mental health conditions, communication style
  environmental_context JSONB, -- Setting, recent events

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only one personalization record per user
  UNIQUE (user_id)
);

-- Emotional Trends Table (for aggregated historical data)
CREATE TABLE IF NOT EXISTS emotional_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Trend data
  dominant_emotions JSONB NOT NULL, -- Array of dominant emotions over period
  sentiment_trend JSONB NOT NULL, -- Sentiment values over time
  volatility_score REAL, -- Emotional volatility (0-1)
  risk_indicators JSONB, -- Detected risk patterns

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_period CHECK (period_end > period_start),
  CONSTRAINT valid_volatility CHECK (volatility_score IS NULL OR (volatility_score >= 0 AND volatility_score <= 1))
);

-- Row-Level Security Policies
-- Ensure users can only access their own emotion data

-- Emotion Analyses Policy
ALTER TABLE emotion_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY emotion_analyses_user_policy ON emotion_analyses
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can see all
CREATE POLICY emotion_analyses_admin_policy ON emotion_analyses
  USING (auth.jwt() ? 'admin' AND auth.jwt()->'admin'::text = 'true'::jsonb);

-- Dimensional Mappings Policy (through parent table)
ALTER TABLE dimensional_emotion_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY dimensional_mappings_user_policy ON dimensional_emotion_mappings
  USING (analysis_id IN (SELECT id FROM emotion_analyses WHERE user_id = auth.uid()));

-- Admin can see all
CREATE POLICY dimensional_mappings_admin_policy ON dimensional_emotion_mappings
  USING (auth.jwt() ? 'admin' AND auth.jwt()->'admin'::text = 'true'::jsonb);

-- Emotional Baselines Policy
ALTER TABLE emotional_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY emotional_baselines_user_policy ON emotional_baselines
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can see all
CREATE POLICY emotional_baselines_admin_policy ON emotional_baselines
  USING (auth.jwt() ? 'admin' AND auth.jwt()->'admin'::text = 'true'::jsonb);

-- Baseline Personalization Policy
ALTER TABLE baseline_personalization ENABLE ROW LEVEL SECURITY;

CREATE POLICY baseline_personalization_user_policy ON baseline_personalization
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can see all
CREATE POLICY baseline_personalization_admin_policy ON baseline_personalization
  USING (auth.jwt() ? 'admin' AND auth.jwt()->'admin'::text = 'true'::jsonb);

-- Emotional Trends Policy
ALTER TABLE emotional_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY emotional_trends_user_policy ON emotional_trends
  USING (user_id = auth.uid());

-- Admin can see all
CREATE POLICY emotional_trends_admin_policy ON emotional_trends
  USING (auth.jwt() ? 'admin' AND auth.jwt()->'admin'::text = 'true'::jsonb);

-- Helper functions
-- Function to get recent emotion analyses for a user
CREATE OR REPLACE FUNCTION get_recent_emotions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  recorded_at TIMESTAMPTZ,
  emotions JSONB,
  overall_sentiment REAL,
  requires_attention BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ea.id,
    ea.recorded_at,
    ea.emotions,
    ea.overall_sentiment,
    ea.requires_attention
  FROM
    emotion_analyses ea
  WHERE
    ea.user_id = p_user_id
  ORDER BY
    ea.recorded_at DESC
  LIMIT
    p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get emotional trend for a date range
CREATE OR REPLACE FUNCTION get_emotion_trend(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT
    jsonb_build_object(
      'emotionTrend', jsonb_agg(
        jsonb_build_object(
          'timestamp', ea.recorded_at,
          'sentiment', ea.overall_sentiment,
          'dominantEmotion', (
            SELECT e->>'type'
            FROM jsonb_array_elements(ea.emotions) e
            ORDER BY (e->>'confidence')::float * (e->>'intensity')::float DESC
            LIMIT 1
          )
        )
        ORDER BY ea.recorded_at
      ),
      'overallSentiment', AVG(ea.overall_sentiment),
      'emotionDistribution', (
        SELECT jsonb_object_agg(
          emotion_type, emotion_count
        )
        FROM (
          SELECT
            e->>'type' AS emotion_type,
            COUNT(*) AS emotion_count
          FROM
            emotion_analyses ea2,
            jsonb_array_elements(ea2.emotions) e
          WHERE
            ea2.user_id = p_user_id
            AND ea2.recorded_at BETWEEN p_start_date AND p_end_date
          GROUP BY
            e->>'type'
        ) AS emotion_counts
      ),
      'attentionRequired', COUNT(*) FILTER (WHERE ea.requires_attention)
    ) INTO result
  FROM
    emotion_analyses ea
  WHERE
    ea.user_id = p_user_id
    AND ea.recorded_at BETWEEN p_start_date AND p_end_date;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
