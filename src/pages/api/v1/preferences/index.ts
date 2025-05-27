import { protectRoute } from '../../../../lib/auth/serverAuth';
import { getUserSettings, updateUserSettings, getOrCreateUserSettings } from '../../../../lib/db/user-settings';
import { getLogger } from '../../../../lib/logging';

const logger = getLogger({ prefix: 'preferences-api' });

const DEFAULT_AI_PREFERENCES = {
  defaultModel: 'gemini-2-flash',
  preferredModels: ['gemini-2-flash', 'claude-3-sonnet'],
  responseLength: 'medium',
  responseStyle: 'balanced',
  enableSentimentAnalysis: true,
  enableCrisisDetection: true,
  crisisDetectionSensitivity: 'medium',
  saveAnalysisResults: true,
  aiSuggestions: true,
};

function validateAIPreferences(input: any): asserts input is typeof DEFAULT_AI_PREFERENCES {
  if (typeof input !== 'object' || input == null) throw new Error('Invalid preferences object');
  if (!['gemini-2-flash', 'gemini-2-flash-lite', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'].includes(input.defaultModel)) throw new Error('Invalid defaultModel');
  if (!Array.isArray(input.preferredModels)) throw new Error('preferredModels must be an array');
  if (!['concise', 'medium', 'detailed'].includes(input.responseLength)) throw new Error('Invalid responseLength');
  if (!['supportive', 'balanced', 'direct'].includes(input.responseStyle)) throw new Error('Invalid responseStyle');
  if (typeof input.enableSentimentAnalysis !== 'boolean') throw new Error('Invalid enableSentimentAnalysis');
  if (typeof input.enableCrisisDetection !== 'boolean') throw new Error('Invalid enableCrisisDetection');
  if (!['low', 'medium', 'high'].includes(input.crisisDetectionSensitivity)) throw new Error('Invalid crisisDetectionSensitivity');
  if (typeof input.saveAnalysisResults !== 'boolean') throw new Error('Invalid saveAnalysisResults');
  if (typeof input.aiSuggestions !== 'boolean') throw new Error('Invalid aiSuggestions');
}

export const GET = protectRoute()(async ({ locals }) => {
  try {
    const { user } = locals;
    const settings = await getOrCreateUserSettings(user.id);
    const aiPrefs = (settings.preferences?.ai ?? DEFAULT_AI_PREFERENCES);
    return new Response(JSON.stringify({ preferences: aiPrefs }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error fetching AI preferences', { error });
    return new Response(JSON.stringify({ error: 'Failed to fetch preferences' }), { status: 500 });
  }
});

export const PUT = protectRoute()(async ({ request, locals }) => {
  try {
    const { user } = locals;
    const body = await request.json();
    if (!body || typeof body.preferences !== 'object') throw new Error('Missing preferences');
    validateAIPreferences(body.preferences);
    const settings = await getOrCreateUserSettings(user.id, request);
    const newPrefs = { ...settings.preferences, ai: body.preferences };
    await updateUserSettings(user.id, { preferences: newPrefs }, request);
    logger.info('AI preferences updated', { userId: user.id });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    logger.error('Error updating AI preferences', { error });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to update preferences' }), { status: 400 });
  }
});

export const DELETE = protectRoute()(async ({ locals, request }) => {
  try {
    const { user } = locals;
    const settings = await getOrCreateUserSettings(user.id, request);
    const newPrefs = { ...settings.preferences, ai: DEFAULT_AI_PREFERENCES };
    await updateUserSettings(user.id, { preferences: newPrefs }, request);
    logger.info('AI preferences reset to defaults', { userId: user.id });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    logger.error('Error resetting AI preferences', { error });
    return new Response(JSON.stringify({ error: 'Failed to reset preferences' }), { status: 500 });
  }
}); 