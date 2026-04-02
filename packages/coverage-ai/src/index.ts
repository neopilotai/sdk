export { CoverageAIClient, createCoverageAIClient } from './client'
export { createGenerateTestTool, createCoverageAnalysisTool, createAllCoverageAITools } from './tool'
export type {
  CoverageAIConfig,
  CoverageReport,
  CoverageFile,
  CoverageAIResult,
  TestGenerationResult,
  CoverageIteration,
  CoverageType,
  AIModel,
  CoverageAIClientOptions,
} from './types'