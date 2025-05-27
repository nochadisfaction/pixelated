/**
 * Preference types for customizing recommendations/interventions
 */
export type PreferenceType = 'technique' | 'communicationStyle' | 'sessionGoal' | 'excludeTechnique'

export interface UserPreference {
  userId: string
  type: PreferenceType
  value: string | string[]
  createdAt: number
  updatedAt: number
}

/**
 * In-memory preference store (extensible for persistent storage)
 */
export class PreferenceService {
  private static preferences: UserPreference[] = []

  /**
   * Add or update a user preference
   */
  static setPreference(pref: Omit<UserPreference, 'createdAt' | 'updatedAt'>): UserPreference {
    if (!pref.userId || !pref.type || !pref.value) {
      throw new Error('userId, type, and value are required for a preference')
    }
    const now = Date.now()
    // Remove existing preference of same type for user
    PreferenceService.preferences = PreferenceService.preferences.filter(
      p => !(p.userId === pref.userId && p.type === pref.type)
    )
    const newPref: UserPreference = {
      ...pref,
      createdAt: now,
      updatedAt: now,
    }
    PreferenceService.preferences.push(newPref)
    return newPref
  }

  /**
   * Get all preferences for a user
   */
  static getPreferences(userId: string): UserPreference[] {
    if (!userId) throw new Error('userId is required')
    return PreferenceService.preferences.filter(p => p.userId === userId)
  }

  /**
   * Get preferences for a user by type
   */
  static getPreferencesByType(userId: string, type: PreferenceType): UserPreference[] {
    if (!userId || !type) throw new Error('userId and type are required')
    return PreferenceService.preferences.filter(p => p.userId === userId && p.type === type)
  }

  /**
   * Remove a preference for a user
   */
  static removePreference(userId: string, type: PreferenceType): boolean {
    const before = PreferenceService.preferences.length
    PreferenceService.preferences = PreferenceService.preferences.filter(
      p => !(p.userId === userId && p.type === type)
    )
    return PreferenceService.preferences.length < before
  }

  /**
   * Merge preferences into context for recommendation personalization
   * (e.g., exclude techniques, boost preferred techniques)
   */
  static applyPreferences<T extends { technique: { id: string; name: string } }>(
    userId: string,
    recommendations: T[],
  ): T[] {
    const prefs = PreferenceService.getPreferences(userId)
    const exclude = prefs
      .filter(p => p.type === 'excludeTechnique')
      .flatMap(p => (Array.isArray(p.value) ? p.value : [p.value]))
    const preferred = prefs
      .filter(p => p.type === 'technique')
      .flatMap(p => (Array.isArray(p.value) ? p.value : [p.value]))
    // Exclude techniques
    let filtered = recommendations.filter(r => !exclude.includes(r.technique.id) && !exclude.includes(r.technique.name))
    // Boost preferred techniques
    filtered = filtered.map(r =>
      preferred.includes(r.technique.id) || preferred.includes(r.technique.name)
        ? { ...r, score: Math.min(1, (r.score || 0) + 0.1) }
        : r
    )
    // Sort again by score
    filtered.sort((a, b) => (b.score || 0) - (a.score || 0))
    return filtered
  }
} 