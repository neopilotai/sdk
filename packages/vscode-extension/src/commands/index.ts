import * as vscode from 'vscode'

export function registerCommands(context: vscode.ExtensionContext) {
  const commands = [
    {
      command: 'repolens.reviewPR',
      callback: () => reviewPR(),
    },
    {
      command: 'repolens.analyzeCoverage',
      callback: () => analyzeCoverage(),
    },
    {
      command: 'repolens.generateTests',
      callback: () => generateTests(),
    },
    {
      command: 'repolens.describePR',
      callback: () => describePR(),
    },
    {
      command: 'repolens.improveCode',
      callback: () => improveCode(),
    },
    {
      command: 'repolens.askQuestion',
      callback: () => askQuestion(),
    },
  ]

  for (const { command, callback } of commands) {
    const disposable = vscode.commands.registerCommand(command, callback)
    context.subscriptions.push(disposable)
  }
}

async function reviewPR() {
  const config = vscode.workspace.getConfiguration('repolens')
  const token = config.get<string>('githubToken')
  
  if (!token) {
    const result = await vscode.window.showInputBox({
      prompt: 'Enter GitHub Token',
      password: true,
    })
    if (!result) return
    await config.update('githubToken', result)
  }

  const prUrl = await getCurrentPRURL()
  if (!prUrl) {
    vscode.window.showErrorMessage('Could not find PR URL')
    return
  }

  vscode.window.showInformationMessage(`Reviewing PR: ${prUrl}...`)
}

async function analyzeCoverage() {
  const config = vscode.workspace.getConfiguration('repolens')
  const token = config.get<string>('githubToken')

  vscode.window.showInformationMessage('Analyzing coverage...')
  
  const coverageFiles = await vscode.workspace.findFiles('**/coverage.xml')
  if (coverageFiles.length > 0) {
    vscode.window.showInformationMessage(`Found coverage report: ${coverageFiles[0].fsPath}`)
  } else {
    vscode.window.showWarningMessage('No coverage.xml found')
  }
}

async function generateTests() {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('No active file')
    return
  }

  const filePath = editor.document.uri.fsPath
  vscode.window.showInformationMessage(`Generating tests for: ${filePath}...`)
}

async function describePR() {
  const config = vscode.workspace.getConfiguration('repolens')
  const token = config.get<string>('githubToken')

  if (!token) {
    vscode.window.showErrorMessage('Please configure GitHub token in settings')
    return
  }

  vscode.window.showInformationMessage('Generating PR description...')
}

async function improveCode() {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('No active file')
    return
  }

  const selection = editor.selection
  const selectedCode = editor.document.getText(selection)
  
  if (!selectedCode) {
    vscode.window.showWarningMessage('Select code to improve')
    return
  }

  vscode.window.showInformationMessage('Getting AI suggestions...')
}

async function askQuestion() {
  const result = await vscode.window.showInputBox({
    prompt: 'Enter your question about the code',
    placeHolder: 'What does this function do?',
  })

  if (!result) return

  vscode.window.showInformationMessage(`Question: ${result}`)
}

async function getCurrentPRURL(): Promise<string | null> {
  const gitExtension = vscode.extensions.getExtension('vscode.git')
  if (!gitExtension) return null

  const git = gitExtension.exports
  const repo = git.API.getRepositories()[0]
  if (!repo) return null

  const branch = await repo.getCurrentBranch()
  if (!branch) return null

  const remotes = await repo.getRemotes()
  const origin = remotes.find((r: { name: string }) => r.name === 'origin') || remotes[0]
  
  if (!origin) return null

  const match = origin.fetchUrl?.match(/github\.com[/:]([^/]+)\/([^/]+)/)
  if (!match) return null

  return `https://github.com/${match[1]}/${match[2]}/pull`
}