import { tool } from 'ai'
import { z } from 'zod'
import { createCoverageAIClient, type CoverageAIConfig } from './client'

export interface CoverageAIToolOptions {
  model?: string
  apiKey?: string
  apiBase?: string
}

export function createGenerateTestTool(_defaultOptions: CoverageAIToolOptions = {}) {
  return tool({
    description: 'Generate unit tests using AI to increase code coverage. Analyzes source code and creates tests that cover uncovered lines.',
    parameters: z.object({
      sourceFilePath: z.string().describe('Path to the source file to test'),
      testFilePath: z.string().describe('Path to the test file where tests will be added'),
      testCommand: z.string().describe('Command to run the tests (e.g., pytest)'),
      codeCoverageReportPath: z.string().describe('Path to the coverage report XML file'),
      projectRoot: z.string().optional().describe('Project root directory'),
      testCommandDir: z.string().optional().describe('Directory to run test command'),
      coverageType: z.enum(['cobertura', 'jacoco', 'golang', 'lcov']).optional().default('cobertura'),
      desiredCoverage: z.number().optional().describe('Desired coverage percentage'),
      maxIterations: z.number().optional().describe('Maximum AI iterations'),
      additionalInstructions: z.string().optional().describe('Additional instructions for test generation'),
    }),
    execute: async (params) => {
      const client = createCoverageAIClient({})

      const config: CoverageAIConfig = {
        sourceFilePath: params.sourceFilePath,
        testFilePath: params.testFilePath,
        testCommand: params.testCommand,
        codeCoverageReportPath: params.codeCoverageReportPath,
        projectRoot: params.projectRoot,
        testCommandDir: params.testCommandDir,
        coverageType: params.coverageType,
        desiredCoverage: params.desiredCoverage,
        maxIterations: params.maxIterations,
        additionalInstructions: params.additionalInstructions,
      }

      return await client.runCoverageAI(config)
    },
  })
}

export function createCoverageAnalysisTool(_defaultOptions: CoverageAIToolOptions = {}) {
  return tool({
    description: 'Analyze coverage report to identify uncovered code and provide insights for test generation.',
    parameters: z.object({
      codeCoverageReportPath: z.string().describe('Path to the coverage report XML file'),
      coverageType: z.enum(['cobertura', 'jacoco', 'golang', 'lcov']).optional().default('cobertura'),
    }),
    execute: async (params) => {
      const client = createCoverageAIClient({})

      const coverage = await client['getCoverage'](params.codeCoverageReportPath, params.coverageType)

      if (!coverage) {
        return { error: 'Failed to parse coverage report' }
      }

      const priorityFiles = coverage.files
        .filter(f => f.uncoveredLines > 0)
        .sort((a, b) => b.uncoveredLines - a.uncoveredLines)
        .slice(0, 10)
        .map(f => ({
          filename: f.filename,
          uncoveredLines: f.uncoveredLines,
          priority: f.uncoveredLines > 50 ? 'high' : f.uncoveredLines > 20 ? 'medium' : 'low',
        }))

      return {
        summary: {
          lineCoverage: coverage.lineCoverage?.toFixed(2) + '%',
          linesCovered: coverage.linesCovered,
          linesUncovered: coverage.linesUncovered,
          totalFiles: coverage.files.length,
        },
        priorityFiles,
      }
    },
  })
}

export function createAllCoverageAITools(defaultOptions: CoverageAIToolOptions = {}) {
  return {
    generateTest: createGenerateTestTool(defaultOptions),
    analyzeCoverage: createCoverageAnalysisTool(defaultOptions),
  }
}