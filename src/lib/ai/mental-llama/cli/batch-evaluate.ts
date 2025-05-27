#!/usr/bin/env node
/**
 * MentalLLaMA Batch Prompt Evaluation CLI
 *
 * This script provides a command-line interface for running batch evaluations
 * of multiple prompt templates against comprehensive test datasets.
 */

import path from 'path'
import fs from 'fs'
import * as Papa from 'papaparse'
import {
  MentalHealthCategory,
  createCategoryTemplate,
  PromptTemplate,
} from '../prompts'
import { PromptTestCase, PromptEvaluationResult } from '../evaluator'
import { getFilteredTestDataset } from '../datasets/comprehensive-test-data'
import { Command } from 'commander'

// Define custom metrics interface
interface PromptEvaluationMetrics {
  accuracy: number
  f1Score: number
  avgConfidence: number
  avgEvidenceCount: number
  avgResponseTime: number
  precision?: number
  recall?: number
  resultCount?: number
}

// Define extended evaluation result
interface ExtendedPromptEvaluationResult extends PromptEvaluationResult {
  isCorrect: boolean
  predictedCategory: string
  confidence?: number
  supportingEvidence?: string[]
  responseTimeMs?: number
  explanation?: string
}

// New specific types to avoid 'any'
interface LoadedResult extends ExtendedPromptEvaluationResult {
  templateName: string
  // specific properties from CSV like testCaseId, prompt, etc. are inherited or should be explicitly part of ExtendedPromptEvaluationResult or its parents
}

interface ComparisonReport {
  evaluations: Record<string, Record<string, PromptEvaluationMetrics>>
  templateComparison: Record<string, Record<string, PromptEvaluationMetrics>>
  categoryComparison: Record<string, unknown>
}

interface RecommendationItem {
  templateName: string
  score: number
  metrics: PromptEvaluationMetrics
}

interface RecommendationsReport {
  overall: RecommendationItem[]
  byCategory: Record<string, RecommendationItem[]>
}

// Export to avoid linting issues
export interface CommandOptions {
  categories: string
  templateDir: string
  dataset: string
  output: string
  model: string
  limit: string
  refinementTechniques: string
  baseline: boolean
  files?: string
  chart?: boolean
  file?: string
  weights?: string
}

// Initialize the program
const program = new Command()
program
  .description('Run batch evaluations of MentalLLaMA prompt templates')
  .version('1.0.0')

// Helper functions

/**
 * Load template files from a directory
 */
export async function loadTemplateFiles(
  templateDir: string,
  categories: MentalHealthCategory[],
): Promise<Record<string, PromptTemplate>> {
  const templates: Record<string, PromptTemplate> = {}

  // Create directory if it doesn't exist
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true })

    // Create sample templates
    for (const category of categories) {
      const baseTemplate = createCategoryTemplate(category)
      const filename = path.join(templateDir, `${category}-base.json`)
      fs.writeFileSync(filename, JSON.stringify(baseTemplate, null, 2))
    }
  }

  // Read all JSON files from the directory
  const files = fs
    .readdirSync(templateDir)
    .filter((file) => file.endsWith('.json'))

  for (const file of files) {
    const templatePath = path.join(templateDir, file)
    const templateName = path.basename(file, '.json')

    try {
      const templateJson = fs.readFileSync(templatePath, 'utf-8')
      const template = JSON.parse(templateJson) as PromptTemplate
      templates[templateName] = template
    } catch (error) {
      console.warn(
        `Warning: Could not load template ${templatePath}: ${(error as Error).message}`,
      )
    }
  }

  return templates
}

/**
 * Prepare test dataset based on options
 */
export function prepareTestDataset(
  datasetName: string,
  categories: MentalHealthCategory[],
  limit: number,
): PromptTestCase[] {
  // Filter by categories
  let filteredDataset = getFilteredTestDataset({
    categories: categories as string[],
    limit: datasetName === 'minimal' ? 1 : undefined,
  })

  // For targeted dataset, pick most representative examples
  if (datasetName === 'targeted') {
    filteredDataset = filteredDataset.filter((test) =>
      test.labels?.includes('explicit'),
    )
  }

  // If limit is specified, take N examples per category
  if (limit > 0 && datasetName !== 'minimal') {
    const limitedDataset: PromptTestCase[] = []

    for (const category of categories) {
      const categoryCases = filteredDataset.filter(
        (test) => test.expectedCategory === category,
      )

      // Take up to the limit
      limitedDataset.push(...categoryCases.slice(0, limit))
    }

    return limitedDataset
  }

  return filteredDataset
}

/**
 * Calculate evaluation metrics
 */
function calculateMetrics(
  results: ExtendedPromptEvaluationResult[],
): PromptEvaluationMetrics {
  if (results.length === 0) {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      avgConfidence: 0,
      avgEvidenceCount: 0,
      avgResponseTime: 0,
    }
  }

  const correctPredictions = results.filter((r) => r.isCorrect).length
  const accuracy = correctPredictions / results.length

  // Calculate precision, recall, and F1 score
  const categoryCounts: Record<string, { tp: number; fp: number; fn: number }> =
    {}

  // Initialize counts for each category
  results.forEach((r) => {
    if (!categoryCounts[r.expectedCategory]) {
      categoryCounts[r.expectedCategory] = { tp: 0, fp: 0, fn: 0 }
    }

    if (!categoryCounts[r.predictedCategory]) {
      categoryCounts[r.predictedCategory] = { tp: 0, fp: 0, fn: 0 }
    }
  })

  // Count true positives, false positives, and false negatives
  results.forEach((r) => {
    if (r.isCorrect) {
      categoryCounts[r.expectedCategory].tp++
    } else {
      categoryCounts[r.expectedCategory].fn++
      categoryCounts[r.predictedCategory].fp++
    }
  })

  // Calculate precision and recall for each category
  let totalPrecision = 0
  let totalRecall = 0
  let categoryCount = 0

  Object.entries(categoryCounts).forEach(([_category, counts]) => {
    if (counts.tp + counts.fp > 0) {
      totalPrecision += counts.tp / (counts.tp + counts.fp)
      categoryCount++
    }

    if (counts.tp + counts.fn > 0) {
      totalRecall += counts.tp / (counts.tp + counts.fn)
    }
  })

  const precision = totalPrecision / categoryCount || 0
  const recall = totalRecall / categoryCount || 0
  const f1Score =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall)

  // Calculate other metrics
  const avgConfidence =
    results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length
  const avgEvidenceCount =
    results.reduce((sum, r) => sum + (r.supportingEvidence?.length || 0), 0) /
    results.length
  const avgResponseTime =
    results.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0) /
    results.length

  return {
    accuracy,
    precision,
    recall,
    f1Score,
    avgConfidence,
    avgEvidenceCount,
    avgResponseTime,
  }
}

/**
 * Write evaluation results to CSV
 */
export async function writeResultsToCSV(
  results: Array<ExtendedPromptEvaluationResult & { templateName: string }>,
  outputPath: string,
): Promise<void> {
  // Prepare data for CSV
  const csvData = results.map((result) => ({
    templateName: result.templateName,
    testCaseId: result.testCaseId,
    expectedCategory: result.expectedCategory,
    predictedCategory: result.predictedCategory,
    isCorrect: result.isCorrect ? 'true' : 'false',
    confidence: result.confidence?.toFixed(4) || '0',
    evidenceCount: result.supportingEvidence?.length || '0',
    responseTimeMs: result.responseTimeMs?.toString() || '0',
    explanation: result.explanation?.substring(0, 100) || '',
  }))

  // Generate CSV using Papa Parse
  const csv = Papa.unparse(csvData)

  // Write to file
  fs.writeFileSync(outputPath, csv, 'utf8')
}

/**
 * Generate a summary report
 */
export async function generateSummaryReport(
  results: Array<ExtendedPromptEvaluationResult & { templateName: string }>,
  outputPath: string,
): Promise<void> {
  // Group results by template
  const templateResults: Record<string, ExtendedPromptEvaluationResult[]> = {}

  results.forEach((result) => {
    if (!templateResults[result.templateName]) {
      templateResults[result.templateName] = []
    }

    templateResults[result.templateName].push(result)
  })

  // Calculate metrics for each template
  const summary: Record<
    string,
    PromptEvaluationMetrics & { resultCount: number }
  > = {}

  for (const [templateName, templateData] of Object.entries(templateResults)) {
    const metrics = calculateMetrics(templateData)
    summary[templateName] = {
      ...metrics,
      resultCount: templateData.length,
    }
  }

  // Calculate category-specific metrics
  const categoryMetrics: Record<
    string,
    Record<string, PromptEvaluationMetrics>
  > = {}

  for (const [templateName, templateData] of Object.entries(templateResults)) {
    // Group by expected category
    const categoryResults: Record<string, ExtendedPromptEvaluationResult[]> = {}

    templateData.forEach((result) => {
      if (!categoryResults[result.expectedCategory]) {
        categoryResults[result.expectedCategory] = []
      }

      categoryResults[result.expectedCategory].push(result)
    })

    // Calculate metrics for each category
    if (!categoryMetrics[templateName]) {
      categoryMetrics[templateName] = {}
    }

    for (const [category, categoryData] of Object.entries(categoryResults)) {
      categoryMetrics[templateName][category] = calculateMetrics(categoryData)
    }
  }

  // Write summary report
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        overall: summary,
        byCategory: categoryMetrics,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  )
}

/**
 * Load results from CSV
 */
export async function loadResultsFromCSV(
  filePath: string,
): Promise<LoadedResult[]> {
  return new Promise((resolve, reject) => {
    try {
      // Read file as string
      const fileContent = fs.readFileSync(filePath, 'utf8')

      // Parse CSV using Papa Parse
      const results = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      })

      if (results.errors && results.errors.length > 0) {
        throw new Error(`CSV parsing error: ${results.errors[0].message}`)
      }

      // Convert string values to appropriate types
      const parsedResults = (
        results.data as Array<Record<string, string | undefined>>
      ).map((row: Record<string, string | undefined>): LoadedResult => {
        // Ensure all properties of LoadedResult are correctly formed.
        const mappedData = {
          // PromptTestCase fields (base of PromptEvaluationResult)
          testCaseId: row.testCaseId || '',
          prompt: row.prompt || '', // Assuming 'prompt' is in CSV or handled if LoadedResult needs it
          inputVariables: row.inputVariables
            ? JSON.parse(row.inputVariables)
            : {}, // Assuming 'inputVariables' is in CSV
          expectedCategory: row.expectedCategory as MentalHealthCategory, // from CSV
          // Optional PromptTestCase fields (e.g., labels, description) would need mapping if in CSV and required by types
          labels: row.labels ? row.labels.split(',') : undefined, // Example, if 'labels' is in CSV

          // PromptEvaluationResult fields (mapping from CSV column names)
          actualCategory: row.predictedCategory as
            | MentalHealthCategory
            | undefined, // CSV 'predictedCategory' maps here
          actualConfidence: row.confidence
            ? parseFloat(row.confidence)
            : undefined, // CSV 'confidence' maps here
          categoryMatch: row.isCorrect === 'true', // CSV 'isCorrect' maps here
          processingTime: row.responseTimeMs
            ? parseInt(row.responseTimeMs, 10)
            : undefined, // CSV 'responseTimeMs' maps here
          supportingEvidence: row.supportingEvidence
            ? row.supportingEvidence.split(',')
            : undefined, // CSV 'supportingEvidence' (if present)
          explanation: row.explanation?.substring(0, 100) || '', // CSV 'explanation'
          error: row.error || undefined, // CSV 'error' (if present)

          // ExtendedPromptEvaluationResult fields (used by calculateMetrics, values from same CSV columns)
          isCorrect: row.isCorrect === 'true',
          predictedCategory: row.predictedCategory || '', // This is string, actualCategory is MentalHealthCategory
          confidence: row.confidence ? parseFloat(row.confidence) : undefined,
          // supportingEvidence and explanation are already covered above from PromptEvaluationResult
          responseTimeMs: row.responseTimeMs
            ? parseInt(row.responseTimeMs, 10)
            : undefined,

          // LoadedResult specific field
          templateName: row.templateName || '',
        }
        return mappedData as LoadedResult
      })

      resolve(parsedResults)
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

/**
 * Compare evaluations
 */
export function compareEvaluations(
  evaluations: Record<string, LoadedResult[]>,
): ComparisonReport {
  const comparisonReport: ComparisonReport = {
    evaluations: {},
    templateComparison: {},
    categoryComparison: {},
  }

  // Calculate metrics for each evaluation
  for (const [fileName, results] of Object.entries(evaluations)) {
    // Group results by template
    const templateResults: Record<string, LoadedResult[]> = {}

    results.forEach((result) => {
      if (!templateResults[result.templateName]) {
        templateResults[result.templateName] = []
      }
      templateResults[result.templateName].push(result)
    })

    // Calculate metrics
    const evaluationMetrics: Record<string, PromptEvaluationMetrics> = {}

    for (const [templateName, templateData] of Object.entries(
      templateResults,
    )) {
      evaluationMetrics[templateName] = calculateMetrics(
        templateData as ExtendedPromptEvaluationResult[],
      )
    }

    comparisonReport.evaluations[fileName] = evaluationMetrics
  }

  // Compare templates across evaluations
  const allTemplates = new Set<string>()

  Object.values(evaluations).forEach((results) => {
    results.forEach((result) => {
      allTemplates.add(result.templateName)
    })
  })

  // For each template, compare metrics across evaluations
  allTemplates.forEach((templateName) => {
    const templateMetrics: Record<string, PromptEvaluationMetrics> = {}

    for (const [fileName, metricsCollection] of Object.entries(
      comparisonReport.evaluations,
    )) {
      if (metricsCollection[templateName]) {
        templateMetrics[fileName] = metricsCollection[templateName]
      }
    }

    comparisonReport.templateComparison[templateName] = templateMetrics
  })

  return comparisonReport
}

/**
 * Generate recommendations
 */
export function generateRecommendations(
  results: LoadedResult[],
  weights: Partial<Record<keyof PromptEvaluationMetrics, number>>,
): RecommendationsReport {
  // Group results by template and category
  const templateResults: Record<string, LoadedResult[]> = {}
  const categoryResults: Record<string, Record<string, LoadedResult[]>> = {}

  results.forEach((result) => {
    // By template
    if (!templateResults[result.templateName]) {
      templateResults[result.templateName] = []
    }
    templateResults[result.templateName].push(result)

    // By category and template
    // result.expectedCategory is MentalHealthCategory, using it as a string key is fine.
    const categoryKey = result.expectedCategory as string
    if (!categoryResults[categoryKey]) {
      categoryResults[categoryKey] = {}
    }
    if (!categoryResults[categoryKey][result.templateName]) {
      categoryResults[categoryKey][result.templateName] = []
    }
    categoryResults[categoryKey][result.templateName].push(result)
  })

  // Calculate metrics and scores
  const recommendations: RecommendationsReport = {
    overall: [],
    byCategory: {},
  }

  // Overall recommendations
  for (const [templateName, templateData] of Object.entries(templateResults)) {
    const metrics = calculateMetrics(
      templateData as ExtendedPromptEvaluationResult[],
    )
    const score = calculateScore(metrics, weights)

    recommendations.overall.push({
      templateName,
      score,
      metrics,
    })
  }

  // Sort by score (descending)
  recommendations.overall.sort((a, b) => b.score - a.score)

  // Category-specific recommendations
  for (const [category, categoryData] of Object.entries(categoryResults)) {
    const categoryRecommendations: RecommendationItem[] = []

    for (const [templateName, templateData] of Object.entries(categoryData)) {
      const metrics = calculateMetrics(
        templateData as ExtendedPromptEvaluationResult[],
      )
      const score = calculateScore(metrics, weights)

      categoryRecommendations.push({
        templateName,
        score,
        metrics,
      })
    }

    // Sort by score (descending)
    categoryRecommendations.sort((a, b) => b.score - a.score)
    recommendations.byCategory[category] = categoryRecommendations
  }

  return recommendations
}

/**
 * Calculate score based on weighted metrics
 */
function calculateScore(
  metrics: PromptEvaluationMetrics,
  weights: Partial<Record<keyof PromptEvaluationMetrics, number>>,
): number {
  let score = 0

  for (const [metricKey, weightValue] of Object.entries(weights)) {
    const metricName = metricKey as keyof PromptEvaluationMetrics
    const metricValue = metrics[metricName]
    // Ensure both metricValue and weightValue are numbers before multiplying
    if (typeof metricValue === 'number' && typeof weightValue === 'number') {
      score += metricValue * weightValue
    }
  }

  return score
}

/**
 * Generate a comparison chart
 */
export async function generateComparisonChart(
  comparison: ComparisonReport,
  outputPath: string,
): Promise<void> {
  // Simple HTML chart template
  const chartHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>MentalLLaMA Prompt Evaluation Comparison</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .chart-container { width: 800px; margin: 20px auto; }
    h1, h2 { text-align: center; }
  </style>
</head>
<body>
  <h1>MentalLLaMA Prompt Evaluation Comparison</h1>

  <div class="chart-container">
    <canvas id="accuracyChart"></canvas>
  </div>

  <div class="chart-container">
    <canvas id="f1Chart"></canvas>
  </div>

  <script>
    // Comparison data
    const comparisonData = ${JSON.stringify(comparison)};

    // Extract data for charts
    const templates = Object.keys(comparisonData.templateComparison);
    const evaluations = Object.keys(comparisonData.evaluations);

    // Create datasets for accuracy chart
    const accuracyDatasets = evaluations.map(evaluation => {
      return {
        label: evaluation,
        data: templates.map(template => {
          if (comparisonData.templateComparison[template][evaluation]) {
            return comparisonData.templateComparison[template][evaluation].accuracy * 100;
          }
          return null;
        }),
        borderWidth: 1
      };
    });

    // Create datasets for F1 chart
    const f1Datasets = evaluations.map(evaluation => {
      return {
        label: evaluation,
        data: templates.map(template => {
          if (comparisonData.templateComparison[template][evaluation]) {
            return comparisonData.templateComparison[template][evaluation].f1Score * 100;
          }
          return null;
        }),
        borderWidth: 1
      };
    });

    // Create accuracy chart
    const accuracyCtx = document.getElementById('accuracyChart');
    new Chart(accuracyCtx, {
      type: 'bar',
      data: {
        labels: templates,
        datasets: accuracyDatasets
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Accuracy Comparison (%)'
          },
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    // Create F1 chart
    const f1Ctx = document.getElementById('f1Chart');
    new Chart(f1Ctx, {
      type: 'bar',
      data: {
        labels: templates,
        datasets: f1Datasets
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'F1 Score Comparison (%)'
          },
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  </script>
</body>
</html>
  `

  fs.writeFileSync(outputPath, chartHtml)
}

// Parse the arguments
program.parse()
