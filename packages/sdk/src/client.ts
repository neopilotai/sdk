import { Octokit } from '@octokit/rest'
import type { 
  SDKOptions,
  PullRequestDetails,
  FileChange,
  ReviewOptions,
  DescriptionOptions,
  SuggestionOptions,
  QuestionsOptions,
  ReviewResult,
  DescriptionResult,
  QuestionResult,
  CodeImprovement,
  LabelsResult,
  UpdateChangelogResult,
  AIModel,
} from './types'

export { Octokit } from '@octokit/rest'
export type {
  ReviewOptions,
  DescriptionOptions,
  SuggestionOptions,
  QuestionsOptions,
  FileChange,
  ReviewResult,
  DescriptionResult,
  QuestionResult,
  CodeImprovement,
  LabelsResult,
  UpdateChangelogResult,
  AIModel,
  PullRequestDetails,
  SDKOptions,
} from './types'

interface PRUrlParts {
  owner: string
  repo: string
  number: number
}

export interface ClientOptions extends SDKOptions {}

export class RepoLensClient {
  private octokit: Octokit
  private model: AIModel
  private apiKey: string
  private baseURL?: string
  private temperature: number

  constructor(options: ClientOptions = {}) {
    const token = options.token || process.env.GITHUB_TOKEN
    if (!token) {
      throw new Error('GitHub token required. Pass as `token` or set GITHUB_TOKEN env.')
    }
    this.octokit = new Octokit({ auth: token })
    this.model = options.model || 'openai/gpt-4o'
    this.apiKey = options.apiKey || process.env.OPENAI_KEY || process.env.ANTHROPIC_API_KEY || ''
    this.baseURL = options.baseURL
    this.temperature = options.temperature ?? 0.2
  }

  private parseUrl(url: string): PRUrlParts {
    const match = url.match(/github\.com[/:]([^/]+)\/([^/]+)\/(?:pull|issues?|pr)\/(\d+)/)
    if (!match) {
      throw new Error(`Invalid URL: ${url}`)
    }
    return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) }
  }

  async getPullRequest(url: string): Promise<PullRequestDetails> {
    const { owner, repo, number } = this.parseUrl(url)
    const { data } = await this.octokit.pulls.get({ owner, repo, pull_number: number })
    return {
      id: String(data.id),
      number: data.number,
      title: data.title,
      body: data.body || '',
      url: data.html_url,
      htmlUrl: data.html_url,
      author: data.user?.login || '',
      state: data.merged ? 'merged' : data.state as 'open' | 'closed',
      baseBranch: data.base.ref,
      headBranch: data.head.ref,
      baseSha: data.base.sha,
      headSha: data.head.sha,
      additions: data.additions || 0,
      deletions: data.deletions || 0,
      changedFiles: data.changed_files || 0,
      isDraft: data.draft || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  async getPullRequestFiles(url: string): Promise<FileChange[]> {
    const { owner, repo, number } = this.parseUrl(url)
    const { data } = await this.octokit.pulls.listFiles({ owner, repo, pull_number: number })
    return data.map(file => ({
      sha: file.sha,
      filename: file.filename,
      status: file.status as FileChange['status'],
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
      previousFilename: file.previous_filename,
    }))
  }

  async getPullRequestDiff(url: string): Promise<string> {
    const { owner, repo, number } = this.parseUrl(url)
    const pr = await this.getPullRequest(url)
    const { data } = await this.octokit.repos.compareCommits({
      owner,
      repo,
      base: pr.baseSha,
      head: pr.headSha,
    })
    return data.files?.map(f => f.patch || `${f.filename}\n${f.status}`).join('\n') || ''
  }

  async getCommits(url: string): Promise<string[]> {
    const { owner, repo, number } = this.parseUrl(url)
    const { data } = await this.octokit.pulls.listCommits({ owner, repo, pull_number: number })
    return data.map(c => c.commit.message.split('\n')[0])
  }

  async reviewPullRequest(url: string, options: ReviewOptions = {}): Promise<ReviewResult> {
    const pr = await this.getPullRequest(url)
    const files = await this.getPullRequestFiles(url)
    const startTime = Date.now()

    const maxFiles = options.maxFiles || 100
    const limitedFiles = files.slice(0, maxFiles)

    const prompt = this.buildReviewPrompt({
      title: pr.title,
      body: pr.body,
      files: limitedFiles,
      options,
    })

    const response = await this.callAI(prompt)
    const result = this.parseReviewResponse(response, limitedFiles)

    let commentUrl = ''
    if (options.publishComment !== false) {
      commentUrl = await this.postReviewComment(pr, result)
    }

    return {
      id: `review-${Date.now()}`,
      prUrl: url,
      model: this.model,
      duration: Date.now() - startTime,
      summary: result.summary,
      changesOverview: result.changesOverview,
      keyIssues: result.keyIssues,
      securityConcerns: result.securityConcerns,
      effortEstimate: result.effortEstimate,
      comments: result.comments,
    }
  }

  async describePullRequest(url: string, options: DescriptionOptions = {}): Promise<DescriptionResult> {
    const pr = await this.getPullRequest(url)
    const files = await this.getPullRequestFiles(url)

    const prompt = this.buildDescribePrompt({
      title: pr.title,
      body: pr.body,
      files,
    })

    const response = await this.callAI(prompt)
    return this.parseDescriptionResponse(response)
  }

  async improvePullRequest(url: string, options: SuggestionOptions = {}): Promise<{ summary: string; improvements: CodeImprovement[]; branch?: string }> {
    const pr = await this.getPullRequest(url)
    const files = await this.getPullRequestFiles(url)

    const maxFiles = options.maxFiles || 10
    const limitedFiles = files.slice(0, maxFiles)

    const prompt = this.buildImprovePrompt({
      title: pr.title,
      body: pr.body,
      files: limitedFiles,
      extraInstructions: options.extraInstructions,
    })

    const response = await this.callAI(prompt)
    const improvements = this.parseImprovements(response)

    let branch: string | undefined
    if (options.createBranch && improvements.length > 0) {
      try {
        branch = await this.createImprovementsBranch(pr, improvements, options.branchName || 'ai-improvements', options.commitMessage || 'AI code improvements')
      } catch {
        // Branch creation failed, continue without it
      }
    }

    const summary = `## Code Improvements\n\nFound ${improvements.length} improvements:\n\n` +
      improvements.map(i => `- **${i.filename}**: ${i.description}`).join('\n')

    return { summary, improvements, branch }
  }

  async askQuestion(url: string, question: string, options: QuestionsOptions = {}): Promise<QuestionResult> {
    const pr = await this.getPullRequest(url)
    const files = await this.getPullRequestFiles(url)

    const prompt = this.buildAskPrompt({
      title: pr.title,
      body: pr.body,
      files,
      question,
    })

    const response = await this.callAI(prompt, options.temperature)

    const parsed = this.parseAskResponse(response)

    return {
      question,
      answer: parsed.answer,
      relevantFiles: parsed.relevantFiles,
    }
  }

  async generateLabels(url: string, model?: AIModel): Promise<LabelsResult> {
    const pr = await this.getPullRequest(url)
    const files = await this.getPullRequestFiles(url)

    const prompt = this.buildLabelsPrompt({
      title: pr.title,
      body: pr.body,
      files,
    })

    const response = await this.callAI(prompt)
    return this.parseLabelsResponse(response)
  }

  async updateChangelog(url: string): Promise<UpdateChangelogResult> {
    const pr = await this.getPullRequest(url)
    const commits = await this.getCommits(url)

    const prompt = this.buildChangelogPrompt({
      title: pr.title,
      commits,
    })

    const response = await this.callAI(prompt)
    return { content: response, filesUpdated: ['CHANGELOG.md'] }
  }

  private async callAI(prompt: string, temperature?: number): Promise<string> {
    const isAnthropic = this.model.startsWith('anthropic')
    const temp = temperature ?? this.temperature

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    const body: Record<string, unknown> = {
      temperature: temp,
    }

    if (isAnthropic) {
      headers['x-api-key'] = this.apiKey
      headers['anthropic-version'] = '2023-06-01'
      body.model = this.model
      body.messages = [{ role: 'user', content: prompt }]
      body.max_tokens = 8192
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`
      body.model = this.model
      body.messages = [{ role: 'user', content: prompt }]
    }

    const baseURL = this.baseURL || (isAnthropic ? 'https://api.anthropic.com' : 'https://api.openai.com')
    const endpoint = isAnthropic ? '/v1/messages' : '/v1/chat/completions'

    const res = await fetch(`${baseURL}${endpoint}`, { method: 'POST', headers, body: JSON.stringify(body) })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`AI API error: ${res.status} ${error}`)
    }

    const data = await res.json() as {
      content?: Array<{ text?: string }>
      choices?: Array<{ message?: { content?: string } }>
    }
    const result = isAnthropic ? data.content?.[0]?.text : data.choices?.[0]?.message?.content
    return result || ''
  }

  private buildReviewPrompt({ title, body, files, options }: {
    title: string
    body: string
    files: FileChange[]
    options: ReviewOptions
  }): string {
    let prompt = `## Pull Request Review\n\nTitle: ${title}\n\nDescription: ${body || '(none)'}\n\n`
    prompt += `### Changed Files (${files.length} files)\n\n`

    for (const file of files) {
      prompt += `#### ${file.filename} (${file.status})\n`
      if (file.patch) {
        prompt += `\`\`\`\n${file.patch.slice(0, 3000)}\n\`\`\`\n\n`
      }
    }

    prompt += `\n### Requirements\n`
    if (options.requireSecurityReview !== false) {
      prompt += `- Check for security vulnerabilities (SQL injection, XSS, auth issues, hardcoded secrets)\n`
    }
    if (options.requireTests !== false) {
      prompt += `- Verify adequate test coverage\n`
    }
    if (options.requireEffortEstimation !== false) {
      prompt += `- Provide effort estimation (1-5 scale)\n`
    }

    prompt += `\n### Output JSON\nProvide review as JSON with keys: summary, keyIssues (array with file, line, description), securityConcerns (yes/no), effortEstimate`

    return prompt
  }

  private buildDescribePrompt({ title, body, files }: {
    title: string
    body: string
    files: FileChange[]
  }): string {
    let prompt = `## Generate PR Description\n\nCurrent title: ${title}\nCurrent description: ${body || '(none)'}\n\n`
    prompt += `### Files Changed (${files.length})\n\n`

    for (const file of files.slice(0, 50)) {
      prompt += `- ${file.filename}: +${file.additions}/-${file.deletions}\n`
    }

    prompt += `\n### Generate a comprehensive PR description in YAML format with:\n`
    prompt += `- title: suggested title\n- type: PR type (feat, fix, docs, refactor, etc.)\n- description: summary\n- changes_summary: per-file changes\n- labels: suggested labels`

    return prompt
  }

  private buildImprovePrompt({ title, body, files, extraInstructions }: {
    title: string
    body: string
    files: FileChange[]
    extraInstructions?: string
  }): string {
    let prompt = `## Code Improvements\n\nPR: ${title}\nDescription: ${body || 'none'}\n\n`
    prompt += `### Files to Improve\n\n`

    for (const file of files.slice(0, 10)) {
      prompt += `#### ${file.filename}\n`
      if (file.patch) {
        prompt += `\`\`\`\n${file.patch.slice(0, 4000)}\n\`\`\`\n`
      }
    }

    prompt += `\n### Focus Areas\n- Bug fixes\n- Performance\n- Security\n- Code simplifications\n- Error handling\n`

    if (extraInstructions) {
      prompt += `\n${extraInstructions}\n`
    }

    prompt += `\n### Output JSON\nProvide improvements as array:\n[{ filename, originalCode, suggestedCode, description }]`

    return prompt
  }

  private buildAskPrompt({ title, body, files, question }: {
    title: string
    body: string
    files: FileChange[]
    question: string
  }): string {
    let prompt = `## Answer Question About PR\n\nQuestion: ${question}\n\nPR Title: ${title}\nPR Description: ${body || 'none'}\n\n`
    prompt += `### Relevant Files\n\n`
    for (const file of files.slice(0, 20)) {
      prompt += `#### ${file.filename}\n`
      if (file.patch) {
        prompt += `\`\`\`\n${file.patch.slice(0, 2000)}\n\`\`\`\n`
      }
    }

    prompt += `\n### Answer the question based on the code above. Output as JSON:\n{ answer, relevantFiles: [] }`

    return prompt
  }

  private buildLabelsPrompt({ title, body, files }: {
    title: string
    body: string
    files: FileChange[]
  }): string {
    let prompt = `## Generate PR Labels\n\nPR: ${title}\nDescription: ${body || 'none'}\n\n`
    prompt += `### Changed Files\n${files.map(f => f.filename).join(', ')}\n\n`
    prompt += `### Suggest appropriate labels as JSON:\n{ type: "feat|fix|docs|refactor|test|chore", labels: [] }`
    return prompt
  }

  private buildChangelogPrompt({ title, commits }: {
    title: string
    commits: string[]
  }): string {
    return `## Update CHANGELOG\n\nPR: ${title}\n\nCommits:\n${commits.join('\n')}\n\nGenerate changelog entry for these changes. Output as JSON:\n{ content: "## ..." }`
  }

  private parseReviewResponse(response: string, files: FileChange[]): {
    summary: string
    changesOverview: { filesChanged: number; additions: number; deletions: number }
    keyIssues: Array<{ file: string; line?: number; description: string; suggestion: string }>
    securityConcerns?: string
    effortEstimate?: string
    comments: Array<{ path: string; line?: number; body: string }>
  } {
    const totals = files.reduce((acc, f) => ({
      files: acc.files + 1,
      additions: acc.additions + f.additions,
      deletions: acc.deletions + f.deletions,
    }), { files: 0, additions: 0, deletions: 0 })

    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response
      const parsed = JSON.parse(jsonStr)

      const keyIssues = (parsed.keyIssues || parsed.key_issues || parsed.issues || []).map((i: Record<string, unknown>) => ({
        file: String(i.file || i.filename || ''),
        line: i.line as number | undefined,
        description: String(i.description || ''),
        suggestion: String(i.suggestion || ''),
      }))

      return {
        summary: parsed.summary || parsed.description || '',
        changesOverview: parsed.changesOverview || { filesChanged: totals.files, additions: totals.additions, deletions: totals.deletions },
        keyIssues,
        securityConcerns: parsed.securityConcerns,
        effortEstimate: parsed.effortEstimate,
        comments: keyIssues.map((i: { file: string; line?: number; description: string }) => ({ path: i.file, line: i.line, body: i.description })),
      }
    } catch {
      return {
        summary: response,
        changesOverview: { filesChanged: totals.files, additions: totals.additions, deletions: totals.deletions },
        keyIssues: [],
        comments: [],
      }
    }
  }

  private parseDescriptionResponse(response: string): DescriptionResult {
    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response
      const parsed = JSON.parse(jsonStr)

      return {
        title: parsed.title || '',
        body: parsed.description || parsed.summary || '',
        type: parsed.type,
        labels: parsed.labels,
        prFiles: parsed.pr_files || parsed.files,
      }
    } catch {
      return { title: '', body: response }
    }
  }

  private parseImprovements(response: string): CodeImprovement[] {
    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?\]/) || response.match(/\[[\s\S]*\]/)
      const jsonStr = jsonMatch ? jsonMatch[0] : response
      const parsed = JSON.parse(jsonStr)

      return parsed.map((p: Record<string, string>) => ({
        filename: p.filename || '',
        description: p.description || '',
        originalCode: p.originalCode || p.original_code || '',
        suggestedCode: p.suggestedCode || p.suggested_code || '',
      }))
    } catch {
      return []
    }
  }

  private parseAskResponse(response: string): { answer: string; relevantFiles: string[] } {
    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response
      const parsed = JSON.parse(jsonStr)

      return {
        answer: parsed.answer || response,
        relevantFiles: parsed.relevantFiles || parsed.relevant_files || [],
      }
    } catch {
      return { answer: response, relevantFiles: [] }
    }
  }

  private parseLabelsResponse(response: string): LabelsResult {
    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response
      const parsed = JSON.parse(jsonStr)

      return {
        labels: parsed.labels || [],
        type: parsed.type || '',
      }
    } catch {
      return { labels: [], type: '' }
    }
  }

  private async postReviewComment(pr: PullRequestDetails, result: {
    summary: string
    changesOverview: { filesChanged: number; additions: number; deletions: number }
    keyIssues: Array<{ file: string; description: string }>
    securityConcerns?: string
    effortEstimate?: string
  }): Promise<string> {
    let body = `## Code Review\n\n${result.summary}\n\n---\n\n`
    body += `**Changes:** ${result.changesOverview.filesChanged} files, +${result.changesOverview.additions}/-${result.changesOverview.deletions}\n\n`

    if (result.keyIssues.length > 0) {
      body += `### Key Issues\n\n`
      for (const issue of result.keyIssues) {
        body += `- **${issue.file}**: ${issue.description}\n`
      }
      body += '\n'
    }

    if (result.securityConcerns) {
      body += `### Security\n\n${result.securityConcerns}\n\n`
    }

    if (result.effortEstimate) {
      body += `### Effort\n\n${result.effortEstimate}\n\n`
    }

    body += `---\n*Review by AI (${this.model})*`

    const { owner, repo } = this.parseUrl(pr.url)
    const { data } = await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: pr.number,
      body,
    })

    return data.html_url
  }

  private async createImprovementsBranch(
    pr: PullRequestDetails,
    improvements: CodeImprovement[],
    branchName: string,
    commitMessage: string
  ): Promise<string> {
    const { owner, repo } = this.parseUrl(pr.url)

    const { data: ref } = await this.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${pr.baseBranch}`,
    })

    await this.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    })

    for (const imp of improvements) {
      try {
        await this.octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: imp.filename,
          message: commitMessage,
          content: Buffer.from(imp.suggestedCode).toString('base64'),
          branch: branchName,
        })
      } catch {
        // Skip files that fail
      }
    }

    return branchName
  }
}

export function createRepoLensClient(options?: ClientOptions): RepoLensClient {
  return new RepoLensClient(options)
}