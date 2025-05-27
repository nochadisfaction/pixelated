import type {
  TherapeuticTechnique,
  EvidenceSource,
} from './RecommendationService'

/**
 * Technique Database Service
 * Provides a secure, extensible in-memory database of therapeutic techniques.
 */
export class TechniqueDatabaseService {
  private static techniques: TherapeuticTechnique[] = [
    {
      id: 'cbt-001',
      name: 'Cognitive Behavioral Therapy (CBT)',
      description:
        "A structured, time-limited psychotherapy that aims to change patterns of thinking or behavior that are behind people's difficulties.",
      indicatedFor: ['depression', 'anxiety', 'insomnia', 'ptsd'],
      contraindications: ['severe cognitive impairment'],
      efficacyRating: 0.9,
      evidenceSources: [
        {
          id: 'meta-001',
          name: 'CBT for Depression: Meta-Analysis',
          type: 'meta-analysis',
          confidence: 0.95,
          relevanceScore: 0.9,
          citation:
            'Butler et al. (2006). The empirical status of cognitive-behavioral therapy: A review of meta-analyses.',
          url: 'https://doi.org/10.1016/j.cpr.2006.01.016',
        } as EvidenceSource,
      ],
    },
    {
      id: 'dbt-001',
      name: 'Dialectical Behavior Therapy (DBT)',
      description:
        'A cognitive-behavioral approach that emphasizes the psychosocial aspects of treatment, especially for borderline personality disorder.',
      indicatedFor: [
        'borderline personality disorder',
        'self-harm',
        'emotion dysregulation',
      ],
      contraindications: ['acute psychosis'],
      efficacyRating: 0.85,
      evidenceSources: [
        {
          id: 'meta-002',
          name: 'DBT for BPD: Meta-Analysis',
          type: 'meta-analysis',
          confidence: 0.92,
          relevanceScore: 0.88,
          citation:
            'Stoffers et al. (2012). Dialectical behaviour therapy for borderline personality disorder.',
          url: 'https://doi.org/10.1002/14651858.CD005652.pub2',
        },
      ],
    },
    {
      id: 'act-001',
      name: 'Acceptance and Commitment Therapy (ACT)',
      description:
        'A form of therapy that uses acceptance and mindfulness strategies, together with commitment and behavior change strategies, to increase psychological flexibility.',
      indicatedFor: ['anxiety', 'depression', 'chronic pain'],
      contraindications: [],
      efficacyRating: 0.8,
      evidenceSources: [
        {
          id: 'meta-003',
          name: 'ACT for Anxiety and Depression: Meta-Analysis',
          type: 'meta-analysis',
          confidence: 0.9,
          relevanceScore: 0.85,
          citation:
            'A-Tjak et al. (2015). A meta-analysis of the efficacy of acceptance and commitment therapy for clinically relevant mental and physical health problems.',
          url: 'https://doi.org/10.1016/j.brat.2015.06.008',
        },
      ],
    },
    {
      id: 'mi-001',
      name: 'Motivational Interviewing (MI)',
      description:
        'A counseling approach that helps people resolve ambivalent feelings and insecurities to find the internal motivation they need to change their behavior.',
      indicatedFor: ['substance use', 'health behavior change'],
      contraindications: ['acute withdrawal'],
      efficacyRating: 0.78,
      evidenceSources: [
        {
          id: 'meta-004',
          name: 'MI for Substance Use: Meta-Analysis',
          type: 'meta-analysis',
          confidence: 0.88,
          relevanceScore: 0.8,
          citation:
            'Lundahl et al. (2010). A meta-analysis of motivational interviewing: Twenty-five years of empirical studies.',
          url: 'https://doi.org/10.1037/a0018918',
        },
      ],
    },
    // Add more techniques as needed
  ]

  /**
   * Get all techniques
   */
  static getAll(): TherapeuticTechnique[] {
    return TechniqueDatabaseService.techniques.slice()
  }

  /**
   * Get technique by id
   */
  static getById(id: string): TherapeuticTechnique | undefined {
    return TechniqueDatabaseService.techniques.find((t) => t.id === id)
  }

  /**
   * Query techniques by indication
   */
  static getByIndication(indication: string): TherapeuticTechnique[] {
    return TechniqueDatabaseService.techniques.filter((t) =>
      t.indicatedFor.includes(indication),
    )
  }

  /**
   * Query techniques by contraindication
   */
  static getByContraindication(contra: string): TherapeuticTechnique[] {
    return TechniqueDatabaseService.techniques.filter((t) =>
      t.contraindications.includes(contra),
    )
  }

  /**
   * Get all unique indications
   */
  static getAllIndications(): string[] {
    const indications = new Set<string>()
    for (const t of TechniqueDatabaseService.techniques) {
      t.indicatedFor.forEach((i) => indications.add(i))
    }
    return Array.from(indications)
  }

  /**
   * Get all unique contraindications
   */
  static getAllContraindications(): string[] {
    const contras = new Set<string>()
    for (const t of TechniqueDatabaseService.techniques) {
      t.contraindications.forEach((c) => contras.add(c))
    }
    return Array.from(contras)
  }
}
