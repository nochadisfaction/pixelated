import type { Database } from '../../../types/supabase'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

// Create mock client for builds
function createMockClient() {
  console.warn(
    'Using mock Supabase client in AI schema module. This should not be used in production.',
  )
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    from: (_table: string) => ({
      insert: () => Promise.resolve({ error: null }),
      select: () => ({
        eq: () => ({
          order: () => ({
            range: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
    rpc: () => Promise.resolve({ error: null }),
  }
}

// Use real client if credentials are available, otherwise use mock
export const supabase =
  supabaseUrl && supabaseKey
    ? createClient<Database>(supabaseUrl, supabaseKey)
    : (createMockClient() as any)

/**
 * Schema definitions for AI analysis tables
 * These are used for type checking and documentation
 */
export const AI_TABLES = {
  SENTIMENT_ANALYSIS: 'ai_sentiment_analysis',
  CRISIS_DETECTION: 'ai_crisis_detection',
  RESPONSE_GENERATION: 'ai_response_generation',
  INTERVENTION_ANALYSIS: 'ai_intervention_analysis',
  USAGE_STATS: 'ai_usage_stats',
}

/**
 * SQL for creating AI analysis tables
 * This can be used to initialize the database schema
 */
export const createAITablesSQL = `
-- Sentiment Analysis Results
CREATE TABLE IF NOT EXISTS ${AI_TABLES.SENTIMENT_ANALYSIS} (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model_id TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  request_tokens INTEGER NOT NULL DEFAULT 0,
  response_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  text TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  score NUMERIC(_5,4) NOT NULL,
  confidence NUMERIC(_5,4) NOT NULL,
  metadata JSONB
);

-- Crisis Detection Results
CREATE TABLE IF NOT EXISTS ${AI_TABLES.CRISIS_DETECTION} (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model_id TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  request_tokens INTEGER NOT NULL DEFAULT 0,
  response_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  text TEXT NOT NULL,
  crisis_detected BOOLEAN NOT NULL DEFAULT false,
  crisis_type TEXT,
  confidence NUMERIC(_5,4) NOT NULL,
  risk_level TEXT NOT NULL,
  sensitivity_level INTEGER NOT NULL DEFAULT 5,
  metadata JSONB
);

-- Response Generation Results
CREATE TABLE IF NOT EXISTS ${AI_TABLES.RESPONSE_GENERATION} (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model_id TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  request_tokens INTEGER NOT NULL DEFAULT 0,
  response_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  context TEXT,
  instructions TEXT,
  temperature NUMERIC(_3,2) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1000,
  metadata JSONB
);

-- Intervention Analysis Results
CREATE TABLE IF NOT EXISTS ${AI_TABLES.INTERVENTION_ANALYSIS} (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model_id TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  request_tokens INTEGER NOT NULL DEFAULT 0,
  response_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  conversation TEXT NOT NULL,
  intervention TEXT NOT NULL,
  user_response TEXT NOT NULL,
  effectiveness NUMERIC(_5,4) NOT NULL,
  insights TEXT NOT NULL,
  recommended_follow_up TEXT,
  metadata JSONB
);

-- AI Usage Statistics
CREATE TABLE IF NOT EXISTS ${AI_TABLES.USAGE_STATS} (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  date DATE NOT NULL,
  total_requests INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost NUMERIC(_10,4) NOT NULL DEFAULT 0,
  model_usage JSONB NOT NULL DEFAULT '{}',
  UNIQUE(user_id, period, date)
);

-- Add RLS policies
ALTER TABLE ${AI_TABLES.SENTIMENT_ANALYSIS} ENABLE ROW LEVEL SECURITY;
ALTER TABLE ${AI_TABLES.CRISIS_DETECTION} ENABLE ROW LEVEL SECURITY;
ALTER TABLE ${AI_TABLES.RESPONSE_GENERATION} ENABLE ROW LEVEL SECURITY;
ALTER TABLE ${AI_TABLES.INTERVENTION_ANALYSIS} ENABLE ROW LEVEL SECURITY;
ALTER TABLE ${AI_TABLES.USAGE_STATS} ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view their own sentiment analysis"
  ON ${AI_TABLES.SENTIMENT_ANALYSIS} FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own crisis detection"
  ON ${AI_TABLES.CRISIS_DETECTION} FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own response generation"
  ON ${AI_TABLES.RESPONSE_GENERATION} FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own intervention analysis"
  ON ${AI_TABLES.INTERVENTION_ANALYSIS} FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own usage stats"
  ON ${AI_TABLES.USAGE_STATS} FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update data
CREATE POLICY "Service role can manage sentiment analysis"
  ON ${AI_TABLES.SENTIMENT_ANALYSIS} FOR ALL
  USING (auth.jwt() ? 'service_role');

CREATE POLICY "Service role can manage crisis detection"
  ON ${AI_TABLES.CRISIS_DETECTION} FOR ALL
  USING (auth.jwt() ? 'service_role');

CREATE POLICY "Service role can manage response generation"
  ON ${AI_TABLES.RESPONSE_GENERATION} FOR ALL
  USING (auth.jwt() ? 'service_role');

CREATE POLICY "Service role can manage intervention analysis"
  ON ${AI_TABLES.INTERVENTION_ANALYSIS} FOR ALL
  USING (auth.jwt() ? 'service_role');

CREATE POLICY "Service role can manage usage stats"
  ON ${AI_TABLES.USAGE_STATS} FOR ALL
  USING (auth.jwt() ? 'service_role');

-- Admins can view all data
CREATE POLICY "Admins can view all sentiment analysis"
  ON ${AI_TABLES.SENTIMENT_ANALYSIS} FOR SELECT
  USING (auth.jwt() ? 'is_admin');

CREATE POLICY "Admins can view all crisis detection"
  ON ${AI_TABLES.CRISIS_DETECTION} FOR SELECT
  USING (auth.jwt() ? 'is_admin');

CREATE POLICY "Admins can view all response generation"
  ON ${AI_TABLES.RESPONSE_GENERATION} FOR SELECT
  USING (auth.jwt() ? 'is_admin');

CREATE POLICY "Admins can view all intervention analysis"
  ON ${AI_TABLES.INTERVENTION_ANALYSIS} FOR SELECT
  USING (auth.jwt() ? 'is_admin');

CREATE POLICY "Admins can view all usage stats"
  ON ${AI_TABLES.USAGE_STATS} FOR SELECT
  USING (auth.jwt() ? 'is_admin');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS sentiment_analysis_user_id_idx ON ${AI_TABLES.SENTIMENT_ANALYSIS}(user_id);
CREATE INDEX IF NOT EXISTS crisis_detection_user_id_idx ON ${AI_TABLES.CRISIS_DETECTION}(user_id);
CREATE INDEX IF NOT EXISTS response_generation_user_id_idx ON ${AI_TABLES.RESPONSE_GENERATION}(user_id);
CREATE INDEX IF NOT EXISTS intervention_analysis_user_id_idx ON ${AI_TABLES.INTERVENTION_ANALYSIS}(user_id);
CREATE INDEX IF NOT EXISTS usage_stats_user_id_period_date_idx ON ${AI_TABLES.USAGE_STATS}(user_id, period, date);
`

/**
 * Initialize AI tables in the database
 */
export async function initializeAITables() {
  try {
    const { error } = await supabase.rpc('execute_sql', {
      sql: createAITablesSQL,
    })

    if (error) {
      console.error('Error initializing AI tables:', error)
      throw error
    }

    console.warn('AI tables initialized successfully')
    return true
  } catch (error) {
    console.error(
      'Failed to initialize AI tables:',
      error instanceof Error ? error : new Error(String(error)),
    )
    throw error instanceof Error ? error : new Error(String(error))
  }
}
