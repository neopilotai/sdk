# @repolens-ai/sdk

[![npm version](https://img.shields.io/npm/v/@repolens-ai/sdk?color=black)](https://npmjs.com/package/@repolens-ai/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@repolens-ai/sdk?color=black)](https://npm.chart.dev/@repolens-ai/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-black?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/github/license/repolens-ai/sdk?color=black)](https://github.com/repolens-ai/sdk/blob/main/LICENSE)

RepoLens for the [AI SDK](https://ai-sdk.dev) — wrap GitHub's REST API as ready-to-use tools for any agent or `generateText` / `streamText` call.

18 tools covering repositories, pull requests, issues, commits, and search. Write operations support granular approval control out of the box.

## Installation

```sh
pnpm add @repolens-ai/sdk
```

`ai` and `zod` are peer dependencies:

```sh
pnpm add ai zod
```

## Quick Start

```ts
import { createRepoLens } from '@repolens-ai/sdk'
import { generateText } from 'ai'

const result = await generateText({
  model: yourModel,
  tools: createRepoLens({ token: process.env.GITHUB_TOKEN! }),
  prompt: 'List the open pull requests on vercel/ai and summarize them.',
})
```

### Presets

Use `preset` to get only the tools relevant to a specific use case:

```ts
// Code-review agent — PRs, commits, file content, and comments
createRepoLens({ token, preset: 'code-review' })

// Issue triage — read/create/close issues, search
createRepoLens({ token, preset: 'issue-triage' })

// Read-only exploration — browse repos without write access
createRepoLens({ token, preset: 'repo-explorer' })

// Full maintenance — all tools
createRepoLens({ token, preset: 'maintainer' })
```

Presets are composable — pass an array to combine them:

```ts
createRepoLens({ token, preset: ['code-review', 'issue-triage'] })
```

| Preset | Tools included |
|---|---|
| `code-review` | `getPullRequest`, `listPullRequests`, `getFileContent`, `listCommits`, `getCommit`, `getRepository`, `listBranches`, `searchCode`, `addPullRequestComment` |
| `issue-triage` | `listIssues`, `getIssue`, `createIssue`, `addIssueComment`, `closeIssue`, `getRepository`, `searchRepositories`, `searchCode` |
| `repo-explorer` | All read-only tools (no write operations) |
| `maintainer` | All 18 tools |

Omit `preset` to get all tools (same as `maintainer`).

### Cherry-Picking Tools

You can also import individual tool factories for full control:

```ts
import { createOctokit, listPullRequests, createIssue } from '@repolens-ai/sdk'

const octokit = createOctokit(process.env.GITHUB_TOKEN!)

const tools = {
  listPullRequests: listPullRequests(octokit),
  createIssue: createIssue(octokit),
}
```

## Approval Control

Write operations (creating issues, merging PRs, pushing files, …) require user approval by default. This is designed for human-in-the-loop agent workflows.

```ts
// All writes need approval (default)
createRepoLens({ token })

// No approval needed
createRepoLens({ token, requireApproval: false })

// Granular: only destructive actions need approval
createRepoLens({
  token,
  requireApproval: {
    mergePullRequest: true,
    createOrUpdateFile: true,
    closeIssue: true,
    createPullRequest: false,
    addPullRequestComment: false,
    createIssue: false,
    addIssueComment: false,
  },
})
```

Write tools: `createOrUpdateFile`, `createPullRequest`, `mergePullRequest`, `addPullRequestComment`, `createIssue`, `addIssueComment`, `closeIssue`.

All other tools are read-only and never require approval.

## Available Tools

### Repository

| Tool | Description |
|---|---|
| `getRepository` | Get repository metadata (stars, language, default branch, …) |
| `listBranches` | List branches |
| `getFileContent` | Read a file or directory listing |
| `createOrUpdateFile` | Create or update a file and commit it |

### Pull Requests

| Tool | Description |
|---|---|
| `listPullRequests` | List PRs filtered by state |
| `getPullRequest` | Get a PR's full details (diff stats, body, merge status) |
| `createPullRequest` | Open a new PR |
| `mergePullRequest` | Merge a PR (merge, squash, or rebase) |
| `addPullRequestComment` | Post a comment on a PR |

### Issues

| Tool | Description |
|---|---|
| `listIssues` | List issues filtered by state and labels |
| `getIssue` | Get an issue's full details |
| `createIssue` | Open a new issue |
| `addIssueComment` | Post a comment on an issue |
| `closeIssue` | Close an issue (completed or not planned) |

### Commits

| Tool | Description |
|---|---|
| `listCommits` | List commits, optionally filtered by file path, author, or date range |
| `getCommit` | Get a commit's full details including changed files and diffs |

### Search

| Tool | Description |
|---|---|
| `searchCode` | Search code across GitHub with qualifier support |
| `searchRepositories` | Search repositories by keyword, topic, language, stars, … |

## GitHub Token

All tools authenticate with a GitHub personal access token (PAT).

### Fine-grained token (recommended)

Create one at **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**.

| Permission | Level | Required for |
|---|---|---|
| **Metadata** | Read-only | Always required (auto-included) |
| **Contents** | Read-only | `getRepository`, `listBranches`, `getFileContent`, `listCommits`, `getCommit` |
| **Contents** | Read and write | `createOrUpdateFile` |
| **Pull requests** | Read-only | `listPullRequests`, `getPullRequest` |
| **Pull requests** | Read and write | `createPullRequest`, `mergePullRequest`, `addPullRequestComment` |
| **Issues** | Read-only | `listIssues`, `getIssue` |
| **Issues** | Read and write | `createIssue`, `addIssueComment`, `closeIssue` |

Search tools (`searchCode`, `searchRepositories`) work with any token.

### Classic token

| Scope | Required for |
|---|---|
| `public_repo` | All tools on public repositories |
| `repo` | All tools on public and private repositories |

## API

### `createRepoLens(options)`

Returns an object of tools, ready to spread into `tools` of any AI SDK call.

```ts
type RepoLensOptions = {
  token: string
  requireApproval?: boolean | Partial<Record<GithubWriteToolName, boolean>>
  preset?: RepoLensPreset | RepoLensPreset[]
}

type RepoLensPreset = 'code-review' | 'issue-triage' | 'repo-explorer' | 'maintainer'
```

### `createGithubAgent(options)`

Returns a `ToolLoopAgent` instance with `.generate()` and `.stream()` methods, pre-configured with RepoLens and tailored instructions.

```ts
import { createGithubAgent } from '@repolens-ai/sdk'

// Minimal — all tools, generic prompt
const agent = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
})

// With preset — scoped tools + tailored prompt
const reviewer = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
  preset: 'code-review',
})

// Add context to the built-in prompt
const triager = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
  preset: 'issue-triage',
  additionalInstructions: 'Focus on the nuxt/ui repository. Always respond in French.',
})

// Full override — replace the built-in prompt entirely
const custom = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
  instructions: 'You are a security auditor. Only flag security-related issues.',
})

// Use the agent
const result = await reviewer.generate({ prompt: 'Review PR #42 on vercel/ai' })
const stream = reviewer.stream({ prompt: 'Review PR #42 on vercel/ai' })
```

| Option | Description |
|---|---|
| `model` | Language model — string (`'anthropic/claude-sonnet-4.6'`) or provider instance |
| `token` | GitHub personal access token |
| `preset` | Optional preset or array of presets to scope tools |
| `requireApproval` | Approval config (same as `createRepoLens`) |
| `instructions` | Replaces the built-in system prompt entirely |
| `additionalInstructions` | Appended to the built-in system prompt |

All other `ToolLoopAgent` options (`stopWhen`, `toolChoice`, `onStepFinish`, etc.) are passed through.

### `createOctokit(token)`

Returns a configured [`@octokit/rest`](https://github.com/octokit/rest.js) instance. Useful when cherry-picking individual tools or building custom ones.

## License

[MIT](./LICENSE)

Made by [@NeoPilot](https://github.com/NeoPilot)
