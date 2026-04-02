import type { Octokit } from '@octokit/rest'

export type AIModel = 
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'anthropic/claude-sonnet-4.6'
  | 'anthropic/claude-3-5-sonnet-20241022'
  | 'deepseek/deepseek-chat'
  | string

export interface PReviewOptions {
  /**
   * GitHub personal access token.
   * Falls back to `process.env.GITHUB_TOKEN` when omitted.
   */
  token?: string
  /**
   * AI model to use for review.
   * @default 'openai/gpt-4o'
   */
  model?: AIModel
  /**
   * API key for the AI provider.
   * Falls back to `process.env.OPENAI_KEY` or `process.env.ANTHROPIC_API_KEY`.
   */
  apiKey?: string
  /**
   * Temperature for AI generation.
   * @default 0.2
   */
  temperature?: number
  /**
   * Whether to publish review as a PR comment.
   * @default true
   */
  publishComment?: boolean
  /**
   * Maximum number of files to review.
   * @default 100
   */
  maxFiles?: number
  /**
   * Additional instructions for the review.
   */
  extraInstructions?: string
  /**
   * Whether to enable security review.
   * @default true
   */
  requireSecurityReview?: boolean
  /**
   * Whether to require test coverage in review.
   * @default false
   */
  requireTests?: boolean
  /**
   * Whether to enable effort estimation.
   * @default true
   */
  requireEffortEstimation?: boolean
  /**
   * Enable persistent comment (updates instead of creating new).
   * @default true
   */
  persistentComment?: boolean
}

export interface PullRequestInfo {
  owner: string
  repo: string
  pullNumber: number
  title: string
  body: string
  url: string
  author: string
  baseBranch: string
  headBranch: string
  state: 'open' | 'closed' | 'merged'
}

export interface FileChange {
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed'
  additions: number
  deletions: number
  patch?: string
  diff?: string
}

export interface ReviewResponse {
  summary: string
  changesOverview?: {
    filesChanged: number
    additions: number
    deletions: number
  }
  keyIssuesToReview?: Array<{
    relevantFile: string
    relevantLine?: number
    suggestion: string
    description: string
  }>
  estimatedEffortToReview?: string
  securityConcerns?: string
  comments?: Array<{
    file: string
    line?: number
    body: string
    severity?: 'info' | 'warning' | 'error'
  }>
}

export interface ReviewResult {
  id: string
  url: string
  model: string
  duration: number
  summary: string
  labels?: string[]
}

export type ReviewSeverity = 'info' | 'warning' | 'error'