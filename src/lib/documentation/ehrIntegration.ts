import type { SessionDocumentation } from '../ai/interfaces/therapy'
import type { FHIRClient, FHIRResource } from '../ehr/types'
import { getLogger } from '../logging'

const logger = getLogger({ prefix: 'ehr-integration' })

/**
 * Interface for EHR export options
 */
export interface EHRExportOptions {
  /**
   * The format to export the documentation in
   */
  format: 'fhir' | 'ccda' | 'pdf'

  /**
   * The patient ID in the EHR system
   */
  patientId: string

  /**
   * The provider ID in the EHR system
   */
  providerId: string

  /**
   * The encounter ID in the EHR system (if applicable)
   */
  encounterId?: string

  /**
   * Custom metadata to include in the export
   */
  metadata?: Record<string, unknown>

  /**
   * Whether to include emotion analysis data
   */
  includeEmotionData?: boolean
}

/**
 * Interface for EHR export result
 */
export interface EHRExportResult {
  /**
   * Whether the export was successful
   */
  success: boolean

  /**
   * The ID of the document in the EHR system (if successful)
   */
  documentId?: string

  /**
   * The status of the export
   */
  status: 'completed' | 'pending' | 'failed'

  /**
   * Error message if the export failed
   */
  error?: string

  /**
   * URL to access the document in the EHR system (if available)
   */
  documentUrl?: string
}

/**
 * Class that handles integration between our documentation system and EHR systems
 */
export class EHRIntegration {
  private fhirClient: FHIRClient
  private auditLog: boolean

  /**
   * Create a new EHR integration
   * @param fhirClient The FHIR client to use for EHR integration
   * @param options Additional options for the integration
   */
  constructor(fhirClient: FHIRClient, options: { auditLog?: boolean } = {}) {
    this.fhirClient = fhirClient
    this.auditLog = options.auditLog ?? true
  }

  /**
   * Export documentation to an EHR system
   * @param sessionDocumentation The documentation to export
   * @param options Export options
   * @returns The result of the export operation
   */
  public async exportToEHR(
    sessionDocumentation: SessionDocumentation,
    options: EHRExportOptions,
  ): Promise<EHRExportResult> {
    try {
      logger.info('Exporting documentation to EHR', {
        format: options.format,
        patientId: options.patientId,
      })

      // Convert documentation to appropriate format
      const formattedDocument = await this.formatDocumentForEHR(
        sessionDocumentation,
        options,
      )

      // Create a FHIR DocumentReference resource
      const documentReference = await this.createDocumentReference(
        formattedDocument,
        options,
      )

      if (this.auditLog) {
        await this.createAuditLog({
          action: 'export',
          resourceType: 'DocumentReference',
          resourceId: documentReference.id,
          userId: options.providerId,
          patientId: options.patientId,
        })
      }

      return {
        success: true,
        documentId: documentReference.id,
        status: 'completed',
        documentUrl: `${this.fhirClient}/DocumentReference/${documentReference.id}`,
      }
    } catch (error) {
      logger.error('Failed to export documentation to EHR', {
        error,
        format: options.format,
        patientId: options.patientId,
      })

      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Format documentation for EHR export
   * @param documentation The documentation to format
   * @param options Format options
   * @returns The formatted document
   */
  private async formatDocumentForEHR(
    documentation: SessionDocumentation,
    options: EHRExportOptions,
  ): Promise<Record<string, unknown>> {
    switch (options.format) {
      case 'fhir':
        return this.convertToFHIRDocument(documentation, options)
      case 'ccda':
        return this.convertToCCDA(documentation, options)
      case 'pdf':
        return this.convertToPDF(documentation, options)
      default:
        throw new Error(`Unsupported format: ${options.format}`)
    }
  }

  /**
   * Convert documentation to FHIR format
   * @param documentation The documentation to convert
   * @param options Conversion options
   * @returns FHIR formatted document
   */
  private convertToFHIRDocument(
    documentation: SessionDocumentation,
    options: EHRExportOptions,
  ): Record<string, unknown> {
    // Create a FHIR Composition resource
    return {
      resourceType: 'Composition',
      status: 'final',
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '11488-4',
            display: 'Consultation note',
          },
        ],
      },
      subject: {
        reference: `Patient/${options.patientId}`,
      },
      date: new Date().toISOString(),
      author: [
        {
          reference: `Practitioner/${options.providerId}`,
        },
      ],
      title: 'Therapy Session Documentation',
      section: [
        {
          title: 'Summary',
          text: {
            status: 'additional',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${documentation.summary}</div>`,
          },
        },
        {
          title: 'Key Insights',
          text: {
            status: 'additional',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${documentation.keyInsights.join(', ')}</div>`,
          },
        },
        {
          title: 'Therapeutic Techniques',
          text: {
            status: 'additional',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${documentation.therapeuticTechniques
              .map(
                (t) =>
                  `${t.name}: ${t.description} (Effectiveness: ${t.effectiveness})`,
              )
              .join('<br/>')}</div>`,
          },
        },
        {
          title: 'Treatment Progress',
          text: {
            status: 'additional',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">
              <p><strong>Overall Assessment:</strong> ${documentation.treatmentProgress.overallAssessment}</p>
              <p><strong>Goals:</strong></p>
              ${documentation.treatmentProgress.goals
                .map(
                  (g) =>
                    `<p>- ${g.description} (Progress: ${g.progress}%)<br/>Notes: ${g.notes}</p>`,
                )
                .join('')}
            </div>`,
          },
        },
        {
          title: 'Next Session Plan',
          text: {
            status: 'additional',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${documentation.nextSessionPlan}</div>`,
          },
        },
      ],
    }
  }

  /**
   * Convert documentation to CCDA format
   * @param documentation The documentation to convert
   * @param options Conversion options
   * @returns CCDA formatted document
   */
  private convertToCCDA(
    documentation: SessionDocumentation,
    _options: EHRExportOptions,
  ): Record<string, unknown> {
    return {
      documentType: 'CCDA',
      content: `<?xml version="1.0" encoding="UTF-8"?>
        <ClinicalDocument xmlns="urn:hl7-org:v3">
          <title>Therapy Session Documentation</title>
          <component>
            <section>
              <title>Summary</title>
              <text>${documentation.summary}</text>
            </section>
            <section>
              <title>Key Insights</title>
              <text>${documentation.keyInsights.join(', ')}</text>
            </section>
            <section>
              <title>Treatment Progress</title>
              <text>
                Overall Assessment: ${documentation.treatmentProgress.overallAssessment}
                Goals:
                ${documentation.treatmentProgress.goals
                  .map(
                    (g) =>
                      `- ${g.description} (Progress: ${g.progress}%)\n  Notes: ${g.notes}`,
                  )
                  .join('\n')}
              </text>
            </section>
          </component>
        </ClinicalDocument>`,
    }
  }

  /**
   * Convert documentation to PDF format
   * @param documentation The documentation to convert
   * @param options Conversion options
   * @returns PDF formatted document
   */
  private convertToPDF(
    documentation: SessionDocumentation,
    _options: EHRExportOptions,
  ): Record<string, unknown> {
    return {
      documentType: 'PDF',
      content: Buffer.from(`
        Title: Therapy Session Documentation
        Date: ${new Date().toISOString()}
        Patient ID: ${_options.patientId}
        Provider ID: ${_options.providerId}

        SUMMARY:
        ${documentation.summary}

        KEY INSIGHTS:
        ${documentation.keyInsights.join('\n- ')}

        THERAPEUTIC TECHNIQUES:
        ${documentation.therapeuticTechniques
          .map(
            (t) =>
              `- ${t.name}: ${t.description} (Effectiveness: ${t.effectiveness})`,
          )
          .join('\n')}

        TREATMENT PROGRESS:
        Overall Assessment: ${documentation.treatmentProgress.overallAssessment}

        Goals:
        ${documentation.treatmentProgress.goals
          .map(
            (g) =>
              `- ${g.description} (Progress: ${g.progress}%)\n  Notes: ${g.notes}`,
          )
          .join('\n')}

        NEXT SESSION PLAN:
        ${documentation.nextSessionPlan}

        ${documentation.emergentIssues ? `\nEMERGENT ISSUES:\n${documentation.emergentIssues.join('\n- ')}` : ''}
        ${documentation.clientStrengths ? `\nCLIENT STRENGTHS:\n${documentation.clientStrengths.join('\n- ')}` : ''}
      `),
    }
  }

  /**
   * Create a FHIR DocumentReference resource
   * @param formattedDocument The formatted document
   * @param options Creation options
   * @returns The created DocumentReference resource
   */
  private async createDocumentReference(
    formattedDocument: Record<string, unknown>,
    options: EHRExportOptions,
  ): Promise<FHIRResource> {
    const now = new Date().toISOString()

    // Create the DocumentReference resource
    const documentReference = {
      resourceType: 'DocumentReference',
      status: 'current',
      docStatus: 'final',
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '11488-4',
            display: 'Consultation note',
          },
        ],
      },
      subject: {
        reference: `Patient/${options.patientId}`,
      },
      date: now,
      author: [
        {
          reference: `Practitioner/${options.providerId}`,
        },
      ],
      custodian: {
        reference: `Organization/1`, // Replace with actual organization ID
      },
      content: [
        {
          attachment: {
            contentType: this.getContentType(options.format),
            data: this.getEncodedData(formattedDocument),
            title: formattedDocument.title || 'Therapy Session Documentation',
            creation: now,
          },
        },
      ],
      context: options.encounterId
        ? {
            encounter: [
              {
                reference: `Encounter/${options.encounterId}`,
              },
            ],
          }
        : undefined,
    }

    // Create the DocumentReference in the EHR system
    return await this.fhirClient.createResource(documentReference)
  }

  /**
   * Create an audit log entry
   * @param auditInfo Audit information
   */
  private async createAuditLog(auditInfo: {
    action: string
    resourceType: string
    resourceId: string
    userId: string
    patientId: string
  }): Promise<void> {
    try {
      const auditEvent = {
        resourceType: 'AuditEvent',
        type: {
          system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
          code: 'rest',
          display: 'RESTful Operation',
        },
        action: auditInfo.action,
        recorded: new Date().toISOString(),
        outcome: 'success',
        agent: [
          {
            type: {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                  code: 'AUT',
                  display: 'author (originator)',
                },
              ],
            },
            who: {
              reference: `Practitioner/${auditInfo.userId}`,
            },
          },
        ],
        source: {
          observer: {
            reference: 'Device/system',
          },
        },
        entity: [
          {
            what: {
              reference: `${auditInfo.resourceType}/${auditInfo.resourceId}`,
            },
          },
          {
            what: {
              reference: `Patient/${auditInfo.patientId}`,
            },
          },
        ],
      }

      await this.fhirClient.createResource(auditEvent)
    } catch (error) {
      logger.error('Failed to create audit log', { error, auditInfo })
    }
  }

  /**
   * Get the content type for a given format
   * @param format The format
   * @returns The content type
   */
  private getContentType(format: 'fhir' | 'ccda' | 'pdf'): string {
    switch (format) {
      case 'fhir':
        return 'application/fhir+json'
      case 'ccda':
        return 'application/xml'
      case 'pdf':
        return 'application/pdf'
      default:
        return 'application/json'
    }
  }

  /**
   * Get encoded data for a document
   * @param document The document
   * @returns Base64 encoded data
   */
  private getEncodedData(document: Record<string, unknown>): string {
    if (typeof document.content === 'string') {
      return Buffer.from(document.content).toString('base64')
    }

    if (document.content instanceof Buffer) {
      return document.content.toString('base64')
    }

    return Buffer.from(JSON.stringify(document)).toString('base64')
  }
}
