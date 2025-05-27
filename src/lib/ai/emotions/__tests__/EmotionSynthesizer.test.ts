import { EmotionSynthesizer } from '../EmotionSynthesizer'
import type { EmotionDimensions, EmotionData } from '../types'

describe('EmotionSynthesizer', () => {
  let synthesizer: EmotionSynthesizer

  beforeEach(() => {
    synthesizer = new EmotionSynthesizer()

    // Mock the database methods
    vi.mock('../database', () => ({
      storeEmotionResponse: vi.fn().mockResolvedValue('response-123'),
    }))
  })

  it('should create an instance of EmotionSynthesizer', () => {
    expect(synthesizer).toBeInstanceOf(EmotionSynthesizer)
  })

  it('should synthesize a verbal response based on detected emotions', async () => {
    // Mock detected emotions
    const emotions: EmotionData[] = [
      { type: 'joy', confidence: 0.9, intensity: 0.8 },
      { type: 'excitement', confidence: 0.7, intensity: 0.6 },
    ]

    const userId = 'user-123'
    const context = 'User is sharing good news about a job promotion'

    // Mock the language model response
    synthesizer.llm.generateEmotionalResponse = vi.fn().mockResolvedValue({
      data: "That's wonderful news! I'm genuinely happy for your success.",
      meta: {
        prompt: 'Generate response for: joy, excitement',
        model: 'gpt-4',
        processingTime: 350,
      },
    })

    const response = await synthesizer.synthesizeVerbalResponse(
      emotions,
      userId,
      context,
    )

    expect(response).toBeDefined()
    expect(response.content).toBe(
      "That's wonderful news! I'm genuinely happy for your success.",
    )
    expect(response.emotions).toEqual(emotions)
    expect(response.userId).toBe(userId)
    expect(response.context).toBe(context)
    expect(response.type).toBe('verbal')
    expect(synthesizer.llm.generateEmotionalResponse).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        emotions,
        context,
      }),
    )
  })

  it('should synthesize a facial expression based on emotion dimensions', async () => {
    // Mock emotion dimensions
    const dimensions: EmotionDimensions = {
      valence: 0.8, // Very positive
      arousal: 0.7, // Somewhat energetic
      dominance: 0.5, // Neutral dominance
    }

    const userId = 'user-123'

    const facialExpression = await synthesizer.synthesizeFacialExpression(
      dimensions,
      userId,
    )

    expect(facialExpression).toBeDefined()
    expect(facialExpression.type).toBe('facial')
    expect(facialExpression.userId).toBe(userId)

    // A positive valence with moderate arousal should give a happy expression
    expect(facialExpression.expression).toMatchObject({
      smile: expect.any(Number),
      eyebrows: expect.any(String),
    })

    // For positive valence, expecting smile value to be high
    expect(facialExpression.expression.smile).toBeGreaterThan(0.5)

    // The expression should reflect the dimensions
    expect(facialExpression.dimensions).toEqual(dimensions)
  })

  it('should synthesize a vocal tone based on emotion dimensions', async () => {
    // Mock emotion dimensions
    const dimensions: EmotionDimensions = {
      valence: -0.6, // Somewhat negative
      arousal: 0.8, // High energy
      dominance: 0.7, // Somewhat dominant
    }

    const userId = 'user-456'
    const text = 'This is a test message'

    const vocalTone = await synthesizer.synthesizeVocalTone(
      dimensions,
      text,
      userId,
    )

    expect(vocalTone).toBeDefined()
    expect(vocalTone.type).toBe('vocal')
    expect(vocalTone.userId).toBe(userId)
    expect(vocalTone.content).toBe(text)

    // Negative valence with high arousal might indicate anger or frustration
    expect(vocalTone.parameters).toMatchObject({
      pitch: expect.any(Number),
      rate: expect.any(Number),
      volume: expect.any(Number),
    })

    // For high arousal, expecting higher volume and possibly faster rate
    expect(vocalTone.parameters.volume).toBeGreaterThan(0.5)

    // The vocal parameters should reflect the dimensions
    expect(vocalTone.dimensions).toEqual(dimensions)
  })

  it('should synthesize gestures based on emotion dimensions', async () => {
    // Mock emotion dimensions
    const dimensions: EmotionDimensions = {
      valence: 0.9, // Very positive
      arousal: 0.8, // High energy
      dominance: 0.4, // Slightly submissive
    }

    const userId = 'user-789'

    const gestures = await synthesizer.synthesizeGestures(dimensions, userId)

    expect(gestures).toBeDefined()
    expect(gestures.type).toBe('gesture')
    expect(gestures.userId).toBe(userId)

    // Positive valence with high arousal might indicate excitement, happiness
    expect(gestures.movements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: expect.any(String),
          intensity: expect.any(Number),
        }),
      ]),
    )

    // For high arousal, expecting more energetic gestures
    const totalIntensity = gestures.movements.reduce(
      (sum, gesture) => sum + gesture.intensity,
      0,
    )
    expect(totalIntensity / gestures.movements.length).toBeGreaterThan(0.5)

    // The gestures should reflect the dimensions
    expect(gestures.dimensions).toEqual(dimensions)
  })

  it('should adapt response style based on user preferences', async () => {
    // Mock detected emotions
    const emotions: EmotionData[] = [
      { type: 'concern', confidence: 0.8, intensity: 0.7 },
    ]

    // Mock user preferences
    const userPreferences = {
      responseStyle: 'direct',
      emotionalExpressiveness: 'moderate',
      formality: 'informal',
    }

    const userId = 'user-prefs'
    const context = 'User is discussing a problem at work'

    // Mock the language model response
    synthesizer.llm.generateEmotionalResponse = vi.fn().mockResolvedValue({
      data: 'That sounds challenging. What specific parts are giving you trouble?',
      meta: {
        prompt: 'Generate direct, moderately expressive response for: concern',
        model: 'gpt-4',
        processingTime: 320,
      },
    })

    const response = await synthesizer.synthesizeVerbalResponse(
      emotions,
      userId,
      context,
      userPreferences,
    )

    expect(response).toBeDefined()
    expect(response.userPreferences).toEqual(userPreferences)
    expect(synthesizer.llm.generateEmotionalResponse).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        userPreferences,
      }),
    )
  })

  it('should store response data in the database', async () => {
    // Mock verbal response data
    const responseData = {
      id: '',
      userId: 'user-store',
      timestamp: new Date().toISOString(),
      type: 'verbal',
      content:
        'I understand you might be feeling frustrated. Would you like to talk about it?',
      emotions: [{ type: 'empathy', confidence: 0.9, intensity: 0.7 }],
      context: 'User expressed frustration with a situation',
    }

    // Mock the database store function
    synthesizer.database.storeEmotionResponse = vi
      .fn()
      .mockResolvedValue('response-id-789')

    const result = await synthesizer.storeResponse(responseData)

    expect(result).toBe('response-id-789')
    expect(synthesizer.database.storeEmotionResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: responseData.userId,
        type: responseData.type,
        content: responseData.content,
      }),
    )
  })

  it('should adjust response intensity based on context appropriateness', async () => {
    // Test with high intensity emotions in a formal context
    const highIntensityEmotions: EmotionData[] = [
      { type: 'excitement', confidence: 0.9, intensity: 0.9 },
      { type: 'joy', confidence: 0.8, intensity: 0.8 },
    ]

    const formalContext = 'User is in a professional business meeting'
    const userId = 'user-formal'

    // Mock the language model response for formal context
    synthesizer.llm.generateEmotionalResponse = vi.fn().mockResolvedValue({
      data: 'I appreciate the positive development. This seems like a promising opportunity.',
      meta: {
        prompt: 'Generate appropriate response for formal context',
        model: 'gpt-4',
        processingTime: 340,
      },
    })

    const formalResponse = await synthesizer.synthesizeVerbalResponse(
      highIntensityEmotions,
      userId,
      formalContext,
      { formality: 'formal' },
    )

    // For a formal context, the response should be more restrained
    expect(formalResponse.content).not.toContain('!')
    expect(formalResponse.content).not.toMatch(/AMAZING|FANTASTIC|WOW/i)

    // Test with same emotions in a casual context
    const casualContext = 'User is chatting with friends at a party'

    // Mock the language model response for casual context
    synthesizer.llm.generateEmotionalResponse = vi.fn().mockResolvedValue({
      data: "That's fantastic news! I'm so excited for you!",
      meta: {
        prompt: 'Generate appropriate response for casual context',
        model: 'gpt-4',
        processingTime: 330,
      },
    })

    const casualResponse = await synthesizer.synthesizeVerbalResponse(
      highIntensityEmotions,
      userId,
      casualContext,
      { formality: 'casual' },
    )

    // For a casual context, the response can be more expressive
    expect(casualResponse.content).toContain('!')
  })

  it('should generate culturally appropriate responses', async () => {
    // Mock emotions
    const emotions: EmotionData[] = [
      { type: 'gratitude', confidence: 0.9, intensity: 0.8 },
    ]

    const userId = 'user-cultural'
    const context = 'User has received a gift'

    // Mock cultural preferences
    const culturalContext = {
      culture: 'japanese',
      languageStyle: 'formal',
      expressiveness: 'reserved',
    }

    // Mock the language model response
    synthesizer.llm.generateEmotionalResponse = vi.fn().mockResolvedValue({
      data: 'I am deeply grateful for your thoughtful gift. Thank you for your kindness.',
      meta: {
        prompt: 'Generate culturally appropriate response for Japanese context',
        model: 'gpt-4',
        processingTime: 360,
      },
    })

    const response = await synthesizer.synthesizeVerbalResponse(
      emotions,
      userId,
      context,
      undefined,
      culturalContext,
    )

    expect(response).toBeDefined()
    expect(response.culturalContext).toEqual(culturalContext)
    expect(synthesizer.llm.generateEmotionalResponse).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        culturalContext,
      }),
    )
  })

  it('should handle empty emotion data gracefully', async () => {
    const emptyEmotions: EmotionData[] = []
    const userId = 'user-empty'
    const context = 'No emotion detected'

    // Mock the language model response
    synthesizer.llm.generateEmotionalResponse = vi.fn().mockResolvedValue({
      data: "I'm not quite sure how to respond to that. Could you share more about what you're thinking?",
      meta: {
        prompt: 'Generate neutral response for no emotions',
        model: 'gpt-4',
        processingTime: 280,
      },
    })

    const response = await synthesizer.synthesizeVerbalResponse(
      emptyEmotions,
      userId,
      context,
    )

    expect(response).toBeDefined()
    expect(response.emotions).toEqual([])
    expect(response.content).toBeTruthy() // Should still generate some content
  })

  it('should handle errors gracefully during response generation', async () => {
    // Mock detected emotions
    const emotions: EmotionData[] = [
      { type: 'confusion', confidence: 0.7, intensity: 0.6 },
    ]

    const userId = 'user-error'
    const context = 'Error test'

    // Mock the language model to throw an error
    synthesizer.llm.generateEmotionalResponse = vi
      .fn()
      .mockRejectedValue(new Error('Language model unavailable'))

    // Should not throw but return a fallback response
    const response = await synthesizer.synthesizeVerbalResponse(
      emotions,
      userId,
      context,
    )

    expect(response).toBeDefined()
    expect(response.content).toBeTruthy() // Should have some fallback content
    expect(response.error).toBeDefined()
    expect(response.error).toContain('Language model unavailable')
  })

  it('should generate multimodal responses combining verbal, facial, and gestural elements', async () => {
    // Mock emotion dimensions
    const dimensions: EmotionDimensions = {
      valence: 0.7, // Positive
      arousal: 0.6, // Moderately energetic
      dominance: 0.5, // Neutral dominance
    }

    // Mock detected emotions
    const emotions: EmotionData[] = [
      { type: 'interest', confidence: 0.8, intensity: 0.7 },
      { type: 'curiosity', confidence: 0.7, intensity: 0.6 },
    ]

    const userId = 'user-multimodal'
    const context = 'User is explaining a complex topic'
    const text =
      "That's a fascinating concept. Could you elaborate on how it works?"

    // Mock the multimodal synthesis
    synthesizer.synthesizeVerbalResponse = vi.fn().mockResolvedValue({
      id: '',
      userId,
      timestamp: new Date().toISOString(),
      type: 'verbal',
      content: text,
      emotions,
      context,
    })

    synthesizer.synthesizeFacialExpression = vi.fn().mockResolvedValue({
      id: '',
      userId,
      timestamp: new Date().toISOString(),
      type: 'facial',
      expression: {
        smile: 0.6,
        eyebrows: 'raised',
        eyeContact: 'engaged',
      },
      dimensions,
    })

    synthesizer.synthesizeGestures = vi.fn().mockResolvedValue({
      id: '',
      userId,
      timestamp: new Date().toISOString(),
      type: 'gesture',
      movements: [
        { type: 'head_tilt', intensity: 0.5 },
        { type: 'lean_forward', intensity: 0.7 },
      ],
      dimensions,
    })

    const multimodalResponse = await synthesizer.generateMultimodalResponse(
      emotions,
      dimensions,
      userId,
      context,
      text,
    )

    expect(multimodalResponse).toBeDefined()
    expect(multimodalResponse.verbal).toBeDefined()
    expect(multimodalResponse.facial).toBeDefined()
    expect(multimodalResponse.gestural).toBeDefined()
    expect(multimodalResponse.verbal.content).toBe(text)
    expect(multimodalResponse.userId).toBe(userId)
    expect(multimodalResponse.timestamp).toBeTruthy()
  })
})
