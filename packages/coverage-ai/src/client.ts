import { exec } from 'child_process'
import { promises as fs } from 'fs'
import type {
  CoverageAIConfig,
  CoverageReport,
  CoverageFile,
  CoverageAIResult,
  TestGenerationResult,
  CoverageIteration,
  AIModel,
  CoverageType,
  CoverageAIClientOptions,
} from './types'

export type { CoverageAIConfig, CoverageAIClientOptions } from './types'

export { Octokit } from '@octokit/rest'

export class CoverageAIClient {
  private model: AIModel
  private apiKey: string
  private apiBase?: string
  private temperature: number

  constructor(options: CoverageAIClientOptions = {}) {
    this.model = options.model || 'openai/gpt-4o'
    this.apiKey = options.apiKey || process.env.OPENAI_KEY || ''
    this.apiBase = options.apiBase
    this.temperature = options.temperature ?? 0.2
  }

  async runCoverageAI(config: CoverageAIConfig): Promise<CoverageAIResult> {
    const startTime = Date.now()
    const iterations: CoverageIteration[] = []
    const maxIterations = config.maxIterations || 10
    let currentCoverage = await this.getCoverage(config.codeCoverageReportPath, config.coverageType)
    let testsGenerated = 0
    let failedIterations = 0

    for (let i = 1; i <= maxIterations; i++) {
      const coverageBefore = currentCoverage?.lineCoverage || 0
      const result = await this.generateTest(config)

      if (!result.success) {
        failedIterations++
        if (result.error) {
          console.error(`Iteration ${i} failed: ${result.error}`)
        }
        continue
      }

      const coverageAfter = await this.getCoverage(config.codeCoverageReportPath, config.coverageType)
      const newCoverage = coverageAfter?.lineCoverage || 0

      iterations.push({
        iteration: i,
        testsAdded: 1,
        coverageBefore,
        coverageAfter: newCoverage,
        newTests: result.testCode,
      })

      testsGenerated++
      currentCoverage = coverageAfter

      if (newCoverage >= (config.desiredCoverage || 70)) {
        break
      }
    }

    const finalCoverage = currentCoverage?.lineCoverage || 0
    return {
      finalCoverage,
      desiredCoverage: finalCoverage >= (config.desiredCoverage || 70),
      iterations,
      totalTestsGenerated: testsGenerated,
      executionTime: Date.now() - startTime,
      failedIterations,
    }
  }

  async generateTest(config: CoverageAIConfig): Promise<TestGenerationResult> {
    try {
      const sourceCode = await fs.readFile(config.sourceFilePath, 'utf-8')
      const testCode = await this.readTestFile(config.testFilePath)
      const coverage = await this.getCoverage(config.codeCoverageReportPath, config.coverageType)

      const prompt = this.buildTestPrompt({
        sourceCode,
        existingTests: testCode,
        coverage,
        additionalInstructions: config.additionalInstructions || '',
      })

      const response = await this.callAI(prompt)
      const testMatch = response.match(/```(?:python|py)\n([\s\S]*?)\n```/)
      const generatedTests = testMatch ? testMatch[1] : response

      await fs.writeFile(config.testFilePath, testCode + '\n' + generatedTests)
      const testResult = await this.runTests(config.testCommand, config.testCommandDir || '.')
      const newCoverage = await this.getCoverage(config.codeCoverageReportPath, config.coverageType)

      return {
        success: testResult.exitCode === 0,
        testCode: generatedTests,
        testsGenerated: 1,
        executionTime: testResult.executionTime,
        error: testResult.stderr,
        coverage: newCoverage,
      }
    } catch (error) {
      return {
        success: false,
        testCode: '',
        testsGenerated: 0,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private async readTestFile(testPath: string): Promise<string> {
    try {
      return await fs.readFile(testPath, 'utf-8')
    } catch {
      return ''
    }
  }

  async getCoverage(reportPath: string, coverageType?: CoverageType): Promise<CoverageReport | undefined> {
    try {
      const content = await fs.readFile(reportPath, 'utf-8')
      if (coverageType === 'jacoco') {
        return this.parseJacocoCoverage(content)
      }
      return this.parseCoberturaCoverage(content)
    } catch {
      return undefined
    }
  }

  private parseCoberturaCoverage(xml: string): CoverageReport {
    const files: CoverageFile[] = []
    let totalLines = 0
    let coveredLines = 0

    const lineRateMatches = xml.matchAll(/<class name="([^"]+)"[^>]*line-rate="([^"]+)"[^>]*>/g)
    for (const match of lineRateMatches) {
      files.push({
        filename: match[1],
        lineCoverage: parseFloat(match[2]) * 100,
        coveredLines: 0,
        uncoveredLines: 0,
      })
      totalLines += 100
      coveredLines += parseFloat(match[2]) * 100
    }

    return {
      lineCoverage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
      linesCovered: Math.round(coveredLines),
      linesUncovered: totalLines - Math.round(coveredLines),
      files,
    }
  }

  private parseJacocoCoverage(xml: string): CoverageReport {
    let linesCovered = 0
    let linesUncovered = 0

    const counterMatch = xml.match(/<counter type="LINE" covered="(\d+)" missed="(\d+)"/)
    if (counterMatch) {
      linesCovered = parseInt(counterMatch[1], 10)
      linesUncovered = parseInt(counterMatch[2], 10)
    }

    const total = linesCovered + linesUncovered
    return {
      lineCoverage: total > 0 ? (linesCovered / total) * 100 : 0,
      linesCovered,
      linesUncovered,
      files: [],
    }
  }

  private async runTests(testCommand: string, workingDir: string): Promise<{
    exitCode: number
    stdout: string
    stderr: string
    executionTime: number
  }> {
    const start = Date.now()
    return new Promise((resolve) => {
      exec(testCommand, { cwd: workingDir }, (error, stdout, stderr) => {
        resolve({
          exitCode: error?.code || 0,
          stdout,
          stderr,
          executionTime: Date.now() - start,
        })
      })
    })
  }

  private buildTestPrompt(params: {
    sourceCode: string
    existingTests: string
    coverage: CoverageReport | undefined
    additionalInstructions: string
  }): string {
    let prompt = `You are an expert test generator. Generate unit tests to increase code coverage.\n\n`
    prompt += `## Source Code\n\`\`\`\n${params.sourceCode}\n\`\`\`\n\n`

    if (params.existingTests) {
      prompt += `## Existing Tests\n\`\`\`\n${params.existingTests}\n\`\`\`\n\n`
    }

    if (params.coverage) {
      prompt += `## Current Coverage: ${params.coverage.lineCoverage?.toFixed(2)}%\n\n`
    }

    prompt += `## Output Format\nGenerate test code:\n\`\`\`python\n# Your test code\n\`\`\``
    return prompt
  }

  private async callAI(prompt: string): Promise<string> {
    const isAnthropic = this.model.startsWith('anthropic')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const body: Record<string, unknown> = { temperature: this.temperature }

    if (isAnthropic) {
      headers['x-api-key'] = this.apiKey
      headers['anthropic-version'] = '2023-06-01'
      body.model = this.model
      body.messages = [{ role: 'user', content: prompt }]
      body.max_tokens = 4096
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`
      body.model = this.model
      body.messages = [{ role: 'user', content: prompt }]
    }

    const baseURL = this.apiBase || (isAnthropic ? 'https://api.anthropic.com' : 'https://api.openai.com')
    const endpoint = isAnthropic ? '/v1/messages' : '/v1/chat/completions'

    const res = await fetch(`${baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`AI API error: ${res.status}`)
    }

    const data = await res.json() as {
      content?: Array<{ text?: string }>
      choices?: Array<{ message?: { content?: string } }>
    }
    return isAnthropic ? data.content?.[0]?.text || '' : data.choices?.[0]?.message?.content || ''
  }
}

export function createCoverageAIClient(options?: CoverageAIClientOptions): CoverageAIClient {
  return new CoverageAIClient(options)
}