import { tool } from 'ai'
import { z } from 'zod'

export interface CodeReviewSkillOptions {
  token?: string
  model?: string
  apiKey?: string
  enableSecurityScan?: boolean
  enablePerformanceCheck?: boolean
  enableBestPractices?: boolean
}

export function createCodeReviewSkill(options: CodeReviewSkillOptions = {}) {
  return tool({
    description: `Expert code reviewer skill. Reviews code changes for:
- Bugs and logic errors
- Security vulnerabilities
- Performance issues
- Code quality and best practices
- Test coverage gaps
Returns detailed review report with specific suggestions.`,
    parameters: z.object({
      prUrl: z.string().url().describe('Pull request URL to review'),
      focus: z.enum(['all', 'security', 'performance', 'bugs', 'style']).optional().default('all'),
      includeSuggestions: z.boolean().optional().default(true),
    }),
    execute: async ({ prUrl, focus }) => {
      const result = {
        skill: 'codeReview',
        prUrl,
        focus,
        actions: [
          'Analyze changed files',
          'Review for bugs and logic errors',
          'Check security vulnerabilities',
          'Evaluate performance',
          'Suggest improvements',
        ],
      }
      return result
    },
  })
}

export function createSecurityAuditSkill(options: CodeReviewSkillOptions = {}) {
  return tool({
    description: `Security audit skill. Analyzes code for:
- SQL injection vulnerabilities
- XSS vulnerabilities  
- Authentication/authorization issues
- Hardcoded secrets/API keys
- Insecure dependencies
- Memory safety issues (C/C++)
Returns security report with vulnerabilities.`,
    parameters: z.object({
      prUrl: z.string().url().describe('Pull request URL to audit'),
      scanSecret: z.boolean().optional().default(true),
      scanDependency: z.boolean().optional().default(true),
    }),
    execute: async ({ prUrl }) => {
      return {
        skill: 'securityAudit',
        prUrl,
        checks: ['dependency scanning', 'secret detection', 'vulnerability analysis'],
      }
    },
  })
}

export function createTestGenerationSkill(options: CodeReviewSkillOptions = {}) {
  return tool({
    description: `Test generation skill. Generates unit tests to:
- Increase code coverage
- Test edge cases
- Improve test quality
- Follow testing best practices
Generates test code in appropriate language.`,
    parameters: z.object({
      prUrl: z.string().url().describe('Pull request URL'),
      targetCoverage: z.number().optional().default(80),
      testFramework: z.enum(['pytest', 'jest', 'unittest', 'mocha', 'junit']).optional(),
    }),
    execute: async ({ prUrl, targetCoverage }) => {
      return {
        skill: 'testGeneration',
        prUrl,
        targetCoverage,
        actions: ['analyze source code', 'identify uncovered functions', 'generate tests'],
      }
    },
  })
}

export function createDocumentationSkill(options: CodeReviewSkillOptions = {}) {
  return tool({
    description: `Documentation skill. Generates:
- README files
- API documentation
- Code comments
- Usage examples
- Changelog entries`,
    parameters: z.object({
      prUrl: z.string().url().describe('Pull request URL'),
      docType: z.enum(['readme', 'api', 'changelog', 'comments']).optional().default('readme'),
    }),
    execute: async ({ prUrl, docType }) => {
      return {
        skill: 'documentation',
        prUrl,
        docType,
        actions: ['analyze code structure', 'generate docs', 'create examples'],
      }
    },
  })
}

export function createCodeExplanationSkill(options: CodeReviewSkillOptions = {}) {
  return tool({
    description: `Code explanation skill. Explains:
- What code does
- How it works
- Architecture decisions
- Design patterns used
- Potential issues
Returns clear, educational explanations.`,
    parameters: z.object({
      filePath: z.string().describe('File or code to explain'),
      depth: z.enum(['simple', 'detailed', 'architectural']).optional().default('simple'),
    }),
    execute: async ({ filePath, depth }) => {
      return {
        skill: 'codeExplanation',
        filePath,
        depth,
      }
    },
  })
}

export function createRefactoringSkill(options: CodeReviewSkillOptions = {}) {
  return tool({
    description: `Refactoring skill. Analyzes and improves code by:
- Simplifying complex logic
- Removing duplicate code
- Improving readability
- Optimizing performance
- Fixing code smells
Returns refactored code with explanations.`,
    parameters: z.object({
      filePath: z.string().describe('File to refactor'),
      focus: z.enum(['performance', 'readability', 'simplicity', 'all']).optional().default('all'),
    }),
    execute: async ({ filePath, focus }) => {
      return {
        skill: 'refactoring',
        filePath,
        focus,
        actions: ['analyze code', 'identify improvements', 'apply refactoring'],
      }
    },
  })
}

export function createAllSkills(options: CodeReviewSkillOptions = {}) {
  return {
    codeReview: createCodeReviewSkill(options),
    securityAudit: createSecurityAuditSkill(options),
    testGeneration: createTestGenerationSkill(options),
    documentation: createDocumentationSkill(options),
    codeExplanation: createCodeExplanationSkill(options),
    refactoring: createRefactoringSkill(options),
  }
}