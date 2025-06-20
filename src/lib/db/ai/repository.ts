import type { Database } from '../../../types/supabase'
import type {
  AIUsageStats,
  CrisisDetectionResult,
  InterventionAnalysisResult,
  ResponseGenerationResult,
  SentimentAnalysisResult,
} from './types'
import type { TherapySession } from '../../ai/models/ai-types'
import type { EmotionAnalysis } from '../../ai/emotions/types'
import { supabase } from '../../supabase'
// TODO: Create these service interfaces when services are implemented
interface EfficacyFeedback {
  recommendation_id: string
  client_id: string
  technique_id: string
  efficacy_rating: number
  timestamp: string
  feedback: string
  session_id: string
  therapist_id: string
  context: Record<string, unknown>
}

interface Technique {
  id: string
  name: string
  description: string
  indication: string
  category: string
}

interface ClientProfile {
  id: string
  preferences: Record<string, unknown>
  personalityTraits: Record<string, unknown>
  riskFactors: string[]
}
import type { RiskFactor, Emotion } from '../../ai/emotions/types'

// Define an interface for items from client_technique_history table
interface ClientTechniqueHistoryItem {
  technique_id: string
  technique_name: string
  last_used_at: string // Supabase returns date/timestamp as string
  efficacy_rating: number
  usage_count: number
}

// Define interfaces for database tables that aren't fully defined in Database type
interface TherapySessionRecord {
  id: string
  client_id: string
  therapist_id: string
  start_time: string
  end_time?: string
  status: string
  security_level: string
  emotion_analysis_enabled: boolean
  metadata: Record<string, unknown>
}

interface EmotionAnalysisRecord {
  id: string
  session_id: string
  client_id: string
  timestamp: string
  text: string
  emotions: Record<string, unknown>
  dominant_emotion: string
  intensity: number
  valence: number
  arousal: number
  dominance: number
  metadata: Record<string, unknown>
  risk_factors?: RiskFactor[]
  requires_attention?: boolean
}

interface EfficacyFeedbackRecord {
  recommendation_id: string
  client_id: string
  technique_id: string
  efficacy_rating: number
  timestamp: string
  feedback: string
  session_id: string
  therapist_id: string
  context: Record<string, unknown>
}

/**
 * Repository for AI analysis results
 */
export class AIRepository {
  /**
   * Store a sentiment analysis result
   */
  async storeSentimentAnalysis(
    result: Omit<SentimentAnalysisResult, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const { data, error } = await supabase
      .from('ai_sentiment_analysis')
      .insert({
        user_id: result?.userId,
        model_id: result?.modelId,
        model_provider: result?.modelProvider,
        request_tokens: result?.requestTokens,
        response_tokens: result?.responseTokens,
        total_tokens: result?.totalTokens,
        latency_ms: result?.latencyMs,
        success: result?.success,
        error: result?.error,
        text: result?.text,
        sentiment: result?.sentiment,
        score: result?.score,
        confidence: result?.confidence,
        metadata: result?.metadata,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error storing sentiment analysis:', error)
      throw error
    }

    return data?.id
  }

  /**
   * Store a crisis detection result
   */
  async storeCrisisDetection(
    result: Omit<CrisisDetectionResult, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const { data, error } = await supabase
      .from('ai_crisis_detection')
      .insert({
        user_id: result?.userId,
        model_id: result?.modelId,
        model_provider: result?.modelProvider,
        request_tokens: result?.requestTokens,
        response_tokens: result?.responseTokens,
        total_tokens: result?.totalTokens,
        latency_ms: result?.latencyMs,
        success: result?.success,
        error: result?.error,
        text: result?.text,
        crisis_detected: result?.crisisDetected,
        crisis_type: result?.crisisType,
        confidence: result?.confidence,
        risk_level: result?.riskLevel,
        sensitivity_level: result?.sensitivityLevel,
        metadata: result?.metadata,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error storing crisis detection:', error)
      throw error
    }

    return data?.id
  }

  /**
   * Store a response generation result
   */
  async storeResponseGeneration(
    result: Omit<ResponseGenerationResult, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const { data, error } = await supabase
      .from('ai_response_generation')
      .insert({
        user_id: result?.userId,
        model_id: result?.modelId,
        model_provider: result?.modelProvider,
        request_tokens: result?.requestTokens,
        response_tokens: result?.responseTokens,
        total_tokens: result?.totalTokens,
        latency_ms: result?.latencyMs,
        success: result?.success,
        error: result?.error,
        prompt: result?.prompt,
        response: result?.response,
        context: result?.context,
        instructions: result?.instructions,
        temperature: result?.temperature,
        max_tokens: result?.maxTokens,
        metadata: result?.metadata,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error storing response generation:', error)
      throw error
    }

    return data?.id
  }

  /**
   * Store an intervention analysis result
   */
  async storeInterventionAnalysis(
    result: Omit<InterventionAnalysisResult, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    if (!result?.userId || !result?.modelId || !result?.modelProvider) {
      throw new Error('Missing required fields')
    }

    const { data, error } = await supabase
      .from('ai_intervention_analysis')
      .insert({
        user_id: result?.userId,
        model_id: result?.modelId,
        model_provider: result?.modelProvider,
        request_tokens: result?.requestTokens ?? 0,
        response_tokens: result?.responseTokens ?? 0,
        total_tokens: result?.totalTokens ?? 0,
        latency_ms: result?.latencyMs ?? 0,
        success: result?.success ?? false,
        error: result?.error ?? null,
        conversation: result?.conversation,
        intervention: result?.intervention,
        user_response: result?.userResponse,
        effectiveness: result?.effectiveness,
        insights: result?.insights,
        recommended_follow_up: result?.recommendedFollowUp ?? null,
        metadata: result?.metadata ?? null,
      } as unknown as Database['public']['Tables']['ai_intervention_analysis']['Insert'])
      .select('id')
      .single()

    if (error) {
      console.error('Error storing intervention analysis:', error)
      throw error
    }

    return data?.id
  }

  /**
   * Update or create AI usage statistics
   */
  async updateUsageStats(stats: Omit<AIUsageStats, 'id'>): Promise<void> {
    const { error } = await supabase.from('ai_usage_stats').upsert(
      {
        user_id: stats.userId,
        period: stats.period,
        date: stats.date.toISOString().split('T')[0],
        total_requests: stats.totalRequests,
        total_tokens: stats.totalTokens,
        total_cost: stats.totalCost,
        model_usage: stats.modelUsage,
      },
      {
        onConflict: 'user_id, period, date',
      },
    )

    if (error) {
      console.error('Error updating AI usage stats:', error)
      throw error
    }
  }

  /**
   * Get sentiment analysis results for a user
   */
  async getSentimentAnalysisByUser(
    userId: string,
    limit = 10,
    offset = 0,
  ): Promise<SentimentAnalysisResult[]> {
    const { data, error } = await supabase
      .from('ai_sentiment_analysis')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting sentiment analysis:', error)
      throw error
    }

    return data?.map(
      (item: Database['public']['Tables']['ai_sentiment_analysis']['Row']) => ({
        id: item.id,
        userId: item.user_id,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        modelId: item.model_id,
        modelProvider: item.model_provider,
        requestTokens: item.request_tokens,
        responseTokens: item.response_tokens,
        totalTokens: item.total_tokens,
        latencyMs: item.latency_ms,
        success: item.success,
        error: item.error,
        text: item.text,
        sentiment: item.sentiment as 'positive' | 'negative' | 'neutral',
        score: item.score,
        confidence: item.confidence,
        metadata: item.metadata || {},
      }),
    )
  }

  /**
   * Get crisis detection results for a user
   */
  async getCrisisDetectionByUser(
    userId: string,
    limit = 10,
    offset = 0,
  ): Promise<CrisisDetectionResult[]> {
    const { data, error } = await supabase
      .from('ai_crisis_detection')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting crisis detection:', error)
      throw error
    }

    return data?.map(
      (item: Database['public']['Tables']['ai_crisis_detection']['Row']) => ({
        id: item.id,
        userId: item.user_id,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        modelId: item.model_id,
        modelProvider: item.model_provider,
        requestTokens: item.request_tokens,
        responseTokens: item.response_tokens,
        totalTokens: item.total_tokens,
        latencyMs: item.latency_ms,
        success: item.success,
        error: item.error,
        text: item.text,
        crisisDetected: item.crisis_detected,
        crisisType: item.crisis_type,
        confidence: item.confidence,
        riskLevel: item.risk_level as 'low' | 'medium' | 'high' | 'critical',
        sensitivityLevel: item.sensitivity_level,
        metadata: item.metadata || {},
      }),
    )
  }

  /**
   * Get response generation results for a user
   */
  async getResponseGenerationByUser(
    userId: string,
    limit = 10,
    offset = 0,
  ): Promise<ResponseGenerationResult[]> {
    const { data, error } = await supabase
      .from('ai_response_generation')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting response generation:', error)
      throw error
    }

    return data?.map(
      (
        item: Database['public']['Tables']['ai_response_generation']['Row'],
      ) => ({
        id: item.id,
        userId: item.user_id,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        modelId: item.model_id,
        modelProvider: item.model_provider,
        requestTokens: item.request_tokens,
        responseTokens: item.response_tokens,
        totalTokens: item.total_tokens,
        latencyMs: item.latency_ms,
        success: item.success,
        error: item.error,
        prompt: item.prompt,
        response: item.response,
        context: item.context,
        instructions: item.instructions,
        temperature: item.temperature,
        maxTokens: item.max_tokens,
        metadata: item.metadata || {},
      }),
    )
  }

  /**
   * Get intervention analysis results for a user
   */
  async getInterventionAnalysisByUser(
    userId: string,
    limit = 10,
    offset = 0,
  ): Promise<InterventionAnalysisResult[]> {
    const { data, error } = await supabase
      .from('ai_intervention_analysis')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting intervention analysis:', error)
      throw error
    }

    return data?.map(
      (
        item: Database['public']['Tables']['ai_intervention_analysis']['Row'],
      ) => ({
        id: item.id,
        userId: item.user_id,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        modelId: item.model_id,
        modelProvider: item.model_provider,
        requestTokens: item.request_tokens,
        responseTokens: item.response_tokens,
        totalTokens: item.total_tokens,
        latencyMs: item.latency_ms,
        success: item.success,
        error: item.error,
        conversation: item.conversation,
        intervention: item.intervention,
        userResponse: item.user_response,
        effectiveness: item.effectiveness,
        insights: item.insights,
        recommendedFollowUp: item.recommended_follow_up,
        metadata: item.metadata || {},
      }),
    )
  }

  /**
   * Get AI usage statistics for a user
   */
  async getUsageStatsByUser(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly',
    limit = 30,
  ): Promise<AIUsageStats[]> {
    const { data, error } = await supabase
      .from('ai_usage_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('period', period)
      .order('date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting AI usage stats:', error)
      throw error
    }

    return data?.map(
      (item: Database['public']['Tables']['ai_usage_stats']['Row']) => ({
        userId: item.user_id,
        period: item.period as 'daily' | 'weekly' | 'monthly',
        date: new Date(item.date),
        totalRequests: item.total_requests,
        totalTokens: item.total_tokens,
        totalCost: item.total_cost,
        modelUsage: item.model_usage as Record<
          string,
          { requests: number; tokens: number; cost: number }
        >,
      }),
    )
  }

  /**
   * Get AI usage statistics for all users (admin only)
   */
  async getAllUsageStats(
    period: 'daily' | 'weekly' | 'monthly',
    limit = 30,
  ): Promise<AIUsageStats[]> {
    const { data, error } = await supabase
      .from('ai_usage_stats')
      .select('*')
      .eq('period', period)
      .order('date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting all AI usage stats:', error)
      throw error
    }

    return data?.map(
      (item: Database['public']['Tables']['ai_usage_stats']['Row']) => ({
        userId: item.user_id,
        period: item.period as 'daily' | 'weekly' | 'monthly',
        date: new Date(item.date),
        totalRequests: item.total_requests,
        totalTokens: item.total_tokens,
        totalCost: item.total_cost,
        modelUsage: item.model_usage as Record<
          string,
          { requests: number; tokens: number; cost: number }
        >,
      }),
    )
  }

  /**
   * Get crisis detections with high risk level (admin only)
   */
  async getHighRiskCrisisDetections(
    limit = 20,
    offset = 0,
  ): Promise<CrisisDetectionResult[]> {
    const { data, error } = await supabase
      .from('ai_crisis_detection')
      .select('*')
      .in('risk_level', ['high', 'critical'])
      .eq('crisis_detected', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting high risk crisis detections:', error)
      throw error
    }

    return data?.map(
      (item: Database['public']['Tables']['ai_crisis_detection']['Row']) => ({
        id: item.id,
        userId: item.user_id,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        modelId: item.model_id,
        modelProvider: item.model_provider,
        requestTokens: item.request_tokens,
        responseTokens: item.response_tokens,
        totalTokens: item.total_tokens,
        latencyMs: item.latency_ms,
        success: item.success,
        error: item.error,
        text: item.text,
        crisisDetected: item.crisis_detected,
        crisisType: item.crisis_type,
        confidence: item.confidence,
        riskLevel: item.risk_level as 'low' | 'medium' | 'high' | 'critical',
        sensitivityLevel: item.sensitivity_level,
        metadata: item.metadata || {},
      }),
    )
  }

  /**
   * Get therapy sessions based on a filter
   *
   * @param filter The filter to apply
   * @returns Array of therapy sessions matching the filter
   */
  async getSessions(filter?: {
    clientId?: string
    therapistId?: string
    startDate?: Date
    endDate?: Date
    status?: string
  }): Promise<TherapySession[]> {
    let query = supabase.from('therapy_sessions').select('*')

    // Apply filters if they exist
    if (filter?.clientId) {
      query = query.eq('client_id', filter.clientId)
    }

    if (filter?.therapistId) {
      query = query.eq('therapist_id', filter.therapistId)
    }

    if (filter?.startDate) {
      query = query.gte('start_time', filter.startDate.toISOString())
    }

    if (filter?.endDate) {
      query = query.lte('end_time', filter.endDate.toISOString())
    }

    if (filter?.status) {
      query = query.eq('status', filter.status)
    }

    const { data, error } = await query.order('start_time', {
      ascending: false,
    })

    if (error) {
      console.error('Error retrieving therapy sessions:', error)
      throw error
    }

    // Map the database record to the TherapySession type
    return (data || []).map((session: TherapySessionRecord) => ({
      sessionId: session.id,
      clientId: session.client_id,
      therapistId: session.therapist_id,
      startTime: new Date(session.start_time),
      endTime: session.end_time ? new Date(session.end_time) : undefined,
      status: session.status,
      securityLevel: session.security_level,
      emotionAnalysisEnabled: session.emotion_analysis_enabled,
      metadata: session.metadata,
    }))
  }

  /**
   * Get therapy sessions by their IDs
   *
   * @param sessionIds Array of session IDs to retrieve
   * @returns Array of therapy sessions matching the provided IDs
   */
  async getSessionsByIds(sessionIds: string[]): Promise<TherapySession[]> {
    if (!sessionIds.length) {
      return []
    }

    const { data, error } = await supabase
      .from('therapy_sessions')
      .select('*')
      .in('id', sessionIds)

    if (error) {
      console.error('Error retrieving therapy sessions by IDs:', error)
      throw error
    }

    // Map the database record to the TherapySession type
    return (data || []).map((session: TherapySessionRecord) => ({
      sessionId: session.id,
      clientId: session.client_id,
      therapistId: session.therapist_id,
      startTime: new Date(session.start_time),
      endTime: session.end_time ? new Date(session.end_time) : undefined,
      status: session.status,
      securityLevel: session.security_level,
      emotionAnalysisEnabled: session.emotion_analysis_enabled,
      metadata: session.metadata,
    }))
  }

  /**
   * Get emotion analysis data for a specific session
   *
   * @param sessionId The session ID to get emotions for
   * @returns Array of emotion analysis data for the session
   */
  async getEmotionsForSession(sessionId: string): Promise<EmotionAnalysis[]> {
    const { data, error } = await supabase
      .from('ai_emotion_analyses')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Error retrieving emotion analyses for session:', error)
      throw error
    }

    // Map the database record to the EmotionAnalysis type
    return (data || []).map((analysis: EmotionAnalysisRecord) => {
      let parsedEmotions: Emotion[] = []
      if (analysis.emotions && typeof analysis.emotions === 'object') {
        // Assuming analysis.emotions is an array of Emotion-like objects or can be cast directly.
        // This might need more robust parsing/validation depending on the actual DB structure.
        try {
          // If it's stored as a JSON string representing Emotion[]
          if (typeof analysis.emotions === 'string') {
            parsedEmotions = JSON.parse(analysis.emotions) as Emotion[]
          } else if (Array.isArray(analysis.emotions)) {
            // If it's already an array (e.g. from Supabase auto-parsing JSONB)
            parsedEmotions = analysis.emotions.map((e) => ({
              ...e,
              timestamp: new Date(e.timestamp), // Ensure timestamp is a Date object
            })) as Emotion[]
          } else {
            // If it's a single object or other structure, this will fail or needs specific handling
            // For now, attempt a direct cast, which is risky.
            // A better approach would be a validation/transformation function.
            parsedEmotions = analysis.emotions as unknown as Emotion[]
          }
        } catch (e) {
          console.error('Failed to parse emotions:', e, analysis.emotions)
          parsedEmotions = [] // Default to empty array on error
        }
      }

      let parsedRiskFactors: RiskFactor[] | undefined = undefined
      if (analysis.risk_factors) {
        if (typeof analysis.risk_factors === 'string') {
          try {
            parsedRiskFactors = JSON.parse(
              analysis.risk_factors,
            ) as RiskFactor[]
          } catch (e) {
            console.error(
              'Failed to parse risk_factors:',
              e,
              analysis.risk_factors,
            )
          }
        } else if (Array.isArray(analysis.risk_factors)) {
          parsedRiskFactors = analysis.risk_factors as RiskFactor[] // Assuming it's already correctly typed
        }
      }

      return {
        id: analysis.id,
        timestamp: new Date(analysis.timestamp),
        emotions: parsedEmotions,
        overallSentiment: analysis.dominant_emotion,
        riskFactors: parsedRiskFactors,
        requiresAttention: analysis.requires_attention,
        input: analysis.text,
        userId: analysis.client_id,
      } as EmotionAnalysis
    })
  }

  /**
   * Check if a therapist is associated with a client
   *
   * @param therapistId The therapist ID to check
   * @param clientId The client ID to check against
   * @returns Boolean indicating if the therapist is associated with the client
   */
  async isTherapistForClient(
    therapistId: string,
    clientId: string,
  ): Promise<boolean> {
    try {
      // Check therapy_client_relationships table
      const { data, error } = await supabase
        .from('therapy_client_relationships')
        .select('*')
        .eq('therapist_id', therapistId)
        .eq('client_id', clientId)
        .limit(1)

      if (error) {
        console.error('Error checking therapist-client relationship:', error)
        throw error
      }

      // If we found at least one relationship record, the therapist is associated with the client
      return data && data.length > 0
    } catch (error) {
      console.error('Error checking therapist-client relationship:', error)
      throw error
    }
  }

  /**
   * Store efficacy feedback for a recommendation
   */
  async storeEfficacyFeedback(feedback: EfficacyFeedback): Promise<void> {
    const { error } = await supabase.from('ai_efficacy_feedback').insert({
      recommendation_id: feedback.recommendationId,
      client_id: feedback.clientId,
      technique_id: feedback.techniqueId,
      efficacy_rating: feedback.efficacyRating,
      timestamp:
        feedback.timestamp instanceof Date
          ? feedback.timestamp.toISOString()
          : feedback.timestamp,
      feedback: feedback.feedback,
      session_id: feedback.sessionId,
      therapist_id: feedback.therapistId,
      context: feedback.context,
    })

    if (error) {
      console.error('Error storing efficacy feedback:', error)
      throw error
    }
  }

  /**
   * Get technique by ID
   */
  async getTechniqueById(techniqueId: string): Promise<Technique | null> {
    const { data, error } = await supabase
      .from('ai_therapeutic_techniques')
      .select('*')
      .eq('id', techniqueId)
      .single()

    if (error) {
      console.error('Error getting technique by ID:', error)
      throw error
    }

    return data
  }

  /**
   * Get efficacy feedback for a technique
   */
  async getEfficacyFeedbackForTechnique(
    techniqueId: string,
  ): Promise<EfficacyFeedback[]> {
    const { data, error } = await supabase
      .from('ai_efficacy_feedback')
      .select('*')
      .eq('technique_id', techniqueId)

    if (error) {
      console.error('Error getting efficacy feedback for technique:', error)
      throw error
    }

    return (data || []).map((item: EfficacyFeedbackRecord) => ({
      recommendationId: item.recommendation_id,
      clientId: item.client_id,
      techniqueId: item.technique_id,
      efficacyRating: item.efficacy_rating,
      timestamp: new Date(item.timestamp),
      feedback: item.feedback,
      sessionId: item.session_id,
      therapistId: item.therapist_id,
      context: item.context,
    }))
  }

  /**
   * Get efficacy feedback for a client
   */
  async getEfficacyFeedbackForClient(
    clientId: string,
  ): Promise<EfficacyFeedback[]> {
    const { data, error } = await supabase
      .from('ai_efficacy_feedback')
      .select('*')
      .eq('client_id', clientId)

    if (error) {
      console.error('Error getting efficacy feedback for client:', error)
      throw error
    }

    return (data || []).map((item: EfficacyFeedbackRecord) => ({
      recommendationId: item.recommendation_id,
      clientId: item.client_id,
      techniqueId: item.technique_id,
      efficacyRating: item.efficacy_rating,
      timestamp: new Date(item.timestamp),
      feedback: item.feedback,
      sessionId: item.session_id,
      therapistId: item.therapist_id,
      context: item.context,
    }))
  }

  /**
   * Get techniques for a specific indication
   */
  async getTechniquesForIndication(indication: string): Promise<Technique[]> {
    const { data, error } = await supabase
      .from('techniques')
      .select('*')
      .contains('indications', [indication])

    if (error) {
      console.error('Error fetching techniques by indication:', error)
      return []
    }
    return data || []
  }

  /**
   * Get a client's profile, including preferences, characteristics, and technique history.
   * Assumes existence of 'client_profiles' and 'client_technique_history' tables.
   */
  async getClientProfile(clientId: string): Promise<ClientProfile | null> {
    // Step 1: Fetch main profile data from 'client_profiles'
    const { data: profileData, error: profileError } = await supabase
      .from('client_profiles')
      .select('preferences, characteristics, demographic')
      .eq('client_id', clientId)
      .single()

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // PostgREST error code for "Searched for one row but found 0 rows"
        // This means the client profile does not exist, which is a valid case.
        console.log(`No client profile found for clientId: ${clientId}`)
        return null
      }
      console.error(
        `Error fetching client profile for clientId ${clientId}:`,
        profileError,
      )
      throw profileError
    }

    // If profileData is null but no error (should not happen with .single() if no record is PGRST116)
    // but as a safeguard, or if a profile exists but is completely empty (all nulls).
    if (!profileData) {
      console.log(
        `Client profile data is unexpectedly null for clientId: ${clientId}, though no explicit error was thrown.`,
      )
      return null
    }

    // Step 2: Fetch technique history from 'client_technique_history'
    const { data: techniqueHistoryData, error: historyError } = await supabase
      .from('client_technique_history')
      .select(
        'technique_id, technique_name, last_used_at, efficacy_rating, usage_count',
      )
      .eq('client_id', clientId)
      .order('last_used_at', { ascending: false })

    if (historyError) {
      console.error(
        `Error fetching technique history for clientId ${clientId}:`,
        historyError,
      )
      // We might still return the profile data even if history fetching fails,
      // or throw, depending on requirements. For now, let's return profile with empty/no history.
      // Or, if history is critical, re-throw: throw historyError;
    }

    const pastTechniques =
      techniqueHistoryData?.map((item: ClientTechniqueHistoryItem) => ({
        techniqueId: item.technique_id,
        techniqueName: item.technique_name,
        lastUsed: new Date(item.last_used_at),
        efficacy: item.efficacy_rating, // Assuming efficacy_rating is a number
        usageCount: item.usage_count,
      })) || []

    // Step 3: Combine into ClientProfile structure
    // The profileData itself can be partial according to ClientProfile interface (e.g. preferences can be undefined)
    const clientProfile: ClientProfile = {
      preferences: profileData.preferences ?? undefined,
      characteristics: profileData.characteristics ?? undefined,
      demographic: profileData.demographic ?? undefined,
      history: {
        pastTechniques,
      },
    }

    // If all parts of the profile are essentially empty after fetching,
    // we might consider this as 'no profile' as well, depending on desired behavior.
    // For now, returning the structured profile even if its fields are undefined/empty arrays.
    // A profile exists if the 'client_profiles' row for clientId exists.

    return clientProfile
  }
}
