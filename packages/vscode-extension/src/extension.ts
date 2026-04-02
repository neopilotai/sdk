import * as vscode from 'vscode'
import { registerCommands } from './commands'
import { registerProviders } from './providers'

export function activate(context: vscode.ExtensionContext) {
  console.log('RepoLens AI extension activating...')

  registerCommands(context)
  registerProviders(context)

  console.log('RepoLens AI extension activated')
}

export function deactivate() {
  console.log('RepoLens AI extension deactivated')
}