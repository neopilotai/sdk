import type { Octokit } from '@octokit/rest'

export type CoverageType = 'cobertura' | 'jacoco' | 'golang' | 'lcov'

export type AIModel =
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'anthropic/claude-sonnet-4.6'
  | 'deepseek/deepseek-chat'
  | string

export interface CoverageAIConfig {
  sourceFilePath: string
  testFilePath: string
  projectRoot?: string
  codeCoverageReportPath: string
  testCommand: string
  testCommandDir?: string
  coverageType?: CoverageType
  desiredCoverage?: number
  maxIterations?: number
  includedFiles?: string[]
  additionalInstructions?: string
  model?: AIModel
  apiKey?: string
  apiBase?: string
  suppressLogFiles?: boolean
  runEachTestSeparately?: boolean
  baseCommand?: string
}

export interface CoverageReport {
  lineCoverage?: number
  branchCoverage?: number
  statements?: number
  linesCovered: number
  linesUncovered: number
  files: CoverageFile[]
}

export interface CoverageFile {
  filename: string
  lineCoverage?: number
  branches?: number
  coveredLines: number
  uncoveredLines: number
}

export interface CoverageAIClientOptions {
  token?: string
  model?: AIModel
  apiKey?: string
  apiBase?: string
  temperature?: number
}

export interface TestGenerationResult {
  success: boolean
  testCode: string
  executionTime?: number
  testsGenerated?: number
  error?: string
  coverage?: CoverageReport
}

export interface CoverageIteration {
  iteration: number
  testsAdded: number
  coverageBefore: number
  coverageAfter: number
  newTests?: string
}

export interface CoverageAIResult {
  finalCoverage: number
  desiredCoverage: boolean
  iterations: CoverageIteration[]
  totalTestsGenerated: number
  executionTime: number
  failedIterations: number
}

export interface FileAnalysis {
  filename: string
  functions: string[]
  classes: string[]
  imports: string[]
  uncoveredLines: number[]
  relevantTestPatterns: string[]
}

export interface ValidationResult {
  valid: boolean
  testsGenerated: number
  testsPassed: number
  testsFailed: number
  newCoverage: number
  errors?: string[]
}

export interface TestDatabaseEntry {
  id: string
  sourceHash: string
  testHash: string
  generatedTests: string
  coverageGained: number
  timestamp: Date
}