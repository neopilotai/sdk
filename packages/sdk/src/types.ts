import type { Octokit } from '@octokit/rest'

export type AIModel =
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'anthropic/claude-sonnet-4.6'
  | 'anthropic/claude-3-5-sonnet-20241022'
  | 'deepseek/deepseek-chat'
  | 'google/gemini-2.0-flash'
  | string

export type GitProvider = 'github' | 'gitlab' | 'bitbucket' | 'azuredevops' | 'gitea' | 'gerrit' | 'codecommit'

export interface SDKOptions {
  /**
   * GitHub personal access token.
   * Falls back to `process.env.GITHUB_TOKEN` when omitted.
   */
  token?: string
  /**
   * AI model to use.
   * @default 'openai/gpt-4o'
   */
  model?: AIModel
  /**
   * API key for the AI provider.
   * Falls back to environment variables.
   */
  apiKey?: string
  /**
   * Base URL for AI API (for self-hosted models).
   */
  baseURL?: string
  /**
   * Temperature for AI generation.
   * @default 0.2
   */
  temperature?: number
  /**
   * git provider to use
   * @default 'github'
   */
  provider?: GitProvider
}

export interface PullRequestDetails {
  id: string
  number: number
  title: string
  body: string
  url: string
  htmlUrl: string
  author: string
  state: 'open' | 'closed' | 'merged'
  baseBranch: string
  headBranch: string
  baseSha: string
  headSha: string
  additions: number
  deletions: number
  changedFiles: number
  isDraft: boolean
  createdAt: string
  updatedAt: string
}

export interface FileChange {
  sha: string
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed'
  additions: number
  deletions: number
  changes: number
  patch?: string
  previousFilename?: string
}

export interface Commit {
  sha: string
  message: string
  author: {
    name: string
    email: string
    date: string
  }
}

export interface Issue {
  id: number
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  author: string
  labels: string[]
  createdAt: string
  updatedAt: string
}

export interface Label {
  name: string
  color: string
  description?: string
}

export interface ReviewComment {
  id?: number
  body: string
  path: string
  line?: number
  author?: string
  createdAt?: string
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: string[]
}

export interface GitProviderInterface {
  getPullRequest(number: number): Promise<PullRequestDetails>
  getPullRequestFiles(number: number): Promise<FileChange[]>
  getPullRequestDiff(number: number): Promise<string>
  getCommitMessages(): Promise<string>
  getLanguages(): Promise<Record<string, number>>
  getDiffFiles(): Promise<FileChange[]>
  getLabels(): Promise<Label[]>
  getIssueComments(issueNumber: number): Promise<ReviewComment[]>
  publishComment(body: string): Promise<string>
  publishDescription(title: string, body: string): Promise<void>
  publishLabels(labels: string[]): Promise<void>
  getLastCommitSha(): string
  getPrUrl(): string
}

export interface ReviewOptions {
  publishComment?: boolean
  requireSecurityReview?: boolean
  requireTests?: boolean
  requireEffortEstimation?: boolean
  persistentComment?: boolean
  maxFiles?: number
  extraInstructions?: string
}

export interface DescriptionOptions {
  publishAsComment?: boolean
  publishLabels?: boolean
  generateAiTitle?: boolean
  enableSemanticFileTypes?: boolean
  includeFileSummaryChanges?: boolean
  useDescriptionMarkers?: boolean
}

export interface QuestionsOptions {
  model?: AIModel
  maxTokens?: number
  temperature?: number
}

export interface SuggestionOptions {
  createBranch?: boolean
  branchName?: string
  commitMessage?: string
  maxFiles?: number
  extraInstructions?: string
}

export interface LabelsResult {
  labels: string[]
  customLabels?: string[]
}

export interface CodeImprovement {
  filename: string
  description: string
  originalCode: string
  suggestedCode: string
}

export interface ReviewResult {
  id: string
  prUrl: string
  model: string
  duration: number
  summary: string
  changesOverview: {
    filesChanged: number
    additions: number
    deletions: number
  }
  keyIssues: Array<{
    file: string
    line?: number
    description: string
    suggestion: string
  }>
  securityConcerns?: string
  effortEstimate?: string
  comments: ReviewComment[]
}

export interface DescriptionResult {
  title: string
  body: string
  type?: string
  labels?: string[]
  prFiles?: Array<{
    filename: string
    changesSummary: string
    changesTitle: string
    label: string
  }>
  changesWalkthrough?: string
}

export interface QuestionResult {
  question: string
  answer: string
  relevantFiles: string[]
}

export interface LabelsResult {
  labels: string[]
  type: string
}

export interface SimilarIssueResult {
  title: string
  url: string
  similarity: number
  status: string
}

export interface UpdateChangelogResult {
  content: string
  filesUpdated: string[]
}