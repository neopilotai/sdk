import * as vscode from 'vscode'

export function registerProviders(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      'javascript',
      new AICompletionProvider(),
      '.',
      '@'
    )
  )
}

class AICompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const items: vscode.CompletionItem[] = []

    const commands = [
      { label: '@review', detail: 'Review pull request with AI' },
      { label: '@describe', detail: 'Generate PR description' },
      { label: '@improve', detail: 'Get code improvement suggestions' },
      { label: '@ask', detail: 'Ask question about code' },
      { label: '@coverage', detail: 'Analyze code coverage' },
      { label: '@tests', detail: 'Generate unit tests' },
    ]

    for (const cmd of commands) {
      const item = new vscode.CompletionItem(cmd.label, vscode.CompletionItemKind.Keyword)
      item.detail = cmd.detail
      items.push(item)
    }

    return items
  }
}