import { tool } from 'ai'
import { z } from 'zod'
import { createRepoLensClient, type ClientOptions, type ReviewOptions, type DescriptionOptions, type SuggestionOptions, type QuestionsOptions } from './client'

const baseOptionsSchema = {
  prUrl: z.string().url().describe('URL of the pull request'),
  token: z.string().optional().describe('GitHub token (or use env GITHUB_TOKEN)'),
  apiKey: z.string().optional().describe('AI API key (or use env OPENAI_KEY)'),
  model: z.string().optional().describe('AI model to use'),
}

function resolveClient(options: { token?: string; apiKey?: string; model?: string }) {
  return createRepoLensClient({
    token: options.token,
    apiKey: options.apiKey,
    model: options.model,
  })
}

export function createReviewTool(defaultOptions: Pick<ClientOptions, 'token' | 'apiKey' | 'model'> = {}) {
  return tool({
    description: 'Review a pull request using AI. Analyzes code changes and provides detailed feedback on bugs, security issues, code quality, and best practices.',
    parameters: z.object({
      ...baseOptionsSchema,
      publishComment: z.boolean().optional().default(true).describe('Publish review as PR comment'),
      requireSecurityReview: z.boolean().optional().default(true).describe('Check for security vulnerabilities'),
      requireTests: z.boolean().optional().default(false).describe('Check for test coverage'),
      requireEffortEstimation: z.boolean().optional().default(true).describe('Estimate review effort'),
      maxFiles: z.number().optional().describe('Maximum files to review'),
      extraInstructions: z.string().optional().describe('Additional instructions'),
    }),
    execute: async (params) => {
      const client = resolveClient({ token: params.token, apiKey: params.apiKey, model: params.model })
      const options: ReviewOptions = {
        publishComment: params.publishComment,
        requireSecurityReview: params.requireSecurityReview,
        requireTests: params.requireTests,
        requireEffortEstimation: params.requireEffortEstimation,
        maxFiles: params.maxFiles,
        extraInstructions: params.extraInstructions,
      }
      return await client.reviewPullRequest(params.prUrl, options)
    },
  })
}

export function createDescribeTool(defaultOptions: Pick<ClientOptions, 'token' | 'apiKey' | 'model'> = {}) {
  return tool({
    description: 'Generate a descriptive title and comprehensive description for a pull request using AI.',
    parameters: z.object({
      ...baseOptionsSchema,
      publishAsComment: z.boolean().optional().describe('Publish description as PR comment'),
      generateAiTitle: z.boolean().optional().default(true).describe('Generate new title'),
      enableSemanticFileTypes: z.boolean().optional().default(true).describe('Group files by type'),
    }),
    execute: async (params) => {
      const client = resolveClient({ token: params.token, apiKey: params.apiKey, model: params.model })
      const options: DescriptionOptions = {
        publishAsComment: params.publishAsComment,
        generateAiTitle: params.generateAiTitle,
        enableSemanticFileTypes: params.enableSemanticFileTypes,
      }
      return await client.describePullRequest(params.prUrl, options)
    },
  })
}

export function createImproveTool(defaultOptions: Pick<ClientOptions, 'token' | 'apiKey' | 'model'> = {}) {
  return tool({
    description: 'Get AI-powered code improvement suggestions for a pull request. Provides concrete fixes for bugs, performance issues, and best practices.',
    parameters: z.object({
      ...baseOptionsSchema,
      createBranch: z.boolean().optional().default(false).describe('Create branch with improvements'),
      branchName: z.string().optional().describe('Branch name for improvements'),
      maxFiles: z.number().optional().describe('Maximum files to improve'),
      extraInstructions: z.string().optional().describe('Additional instructions'),
    }),
    execute: async (params) => {
      const client = resolveClient({ token: params.token, apiKey: params.apiKey, model: params.model })
      const options: SuggestionOptions = {
        createBranch: params.createBranch,
        branchName: params.branchName,
        maxFiles: params.maxFiles,
        extraInstructions: params.extraInstructions,
      }
      return await client.improvePullRequest(params.prUrl, options)
    },
  })
}

export function createAskTool(defaultOptions: Pick<ClientOptions, 'token' | 'apiKey' | 'model'> = {}) {
  return tool({
    description: 'Ask a question about code in a pull request. The AI will analyze the changes and provide an answer.',
    parameters: z.object({
      ...baseOptionsSchema,
      question: z.string().describe('Question to ask about the PR code'),
    }),
    execute: async (params) => {
      const client = resolveClient({ token: params.token, apiKey: params.apiKey, model: params.model })
      const options: QuestionsOptions = { temperature: 0.2 }
      return await client.askQuestion(params.prUrl, params.question, options)
    },
  })
}

export function createLabelsTool(defaultOptions: Pick<ClientOptions, 'token' | 'apiKey' | 'model'> = {}) {
  return tool({
    description: 'Generate appropriate labels for a pull request based on its content.',
    parameters: z.object({
      ...baseOptionsSchema,
    }),
    execute: async (params) => {
      const client = resolveClient({ token: params.token, apiKey: params.apiKey, model: params.model })
      return await client.generateLabels(params.prUrl, params.model)
    },
  })
}

export function createChangelogTool(defaultOptions: Pick<ClientOptions, 'token' | 'apiKey' | 'model'> = {}) {
  return tool({
    description: 'Update CHANGELOG.md with changes from a pull request.',
    parameters: z.object({
      ...baseOptionsSchema,
    }),
    execute: async (params) => {
      const client = resolveClient({ token: params.token, apiKey: params.apiKey, model: params.model })
      return await client.updateChangelog(params.prUrl)
    },
  })
}

export function createAllTools(defaultOptions: Pick<ClientOptions, 'token' | 'apiKey' | 'model'> = {}) {
  return {
    review: createReviewTool(defaultOptions),
    describe: createDescribeTool(defaultOptions),
    improve: createImproveTool(defaultOptions),
    ask: createAskTool(defaultOptions),
    labels: createLabelsTool(defaultOptions),
    changelog: createChangelogTool(defaultOptions),
  }
}