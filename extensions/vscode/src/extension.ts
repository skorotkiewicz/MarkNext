import * as vscode from 'vscode';
import { compile } from '../../src/index';

export function activate(context: vscode.ExtensionContext) {
  // Preview command
  const previewCommand = vscode.commands.registerCommand('marknext.preview', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    if (document.languageId !== 'marknext') {
      vscode.window.showErrorMessage('Not a MarkNext file');
      return;
    }

    const source = document.getText();
    const result = compile(source, { pretty: true });

    // Create webview panel for preview
    const panel = vscode.window.createWebviewPanel(
      'marknextPreview',
      `Preview: ${document.fileName.split('/').pop()}`,
      vscode.ViewColumn.Two,
      { enableScripts: true }
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
          }
          h1, h2, h3, h4, h5, h6 {
            color: var(--vscode-titleBar-activeForeground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 0.3em;
          }
          code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'SF Mono', Monaco, Inconsolata, 'Fira Code', monospace;
          }
          pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
          }
          pre code {
            background: none;
            padding: 0;
          }
          blockquote {
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            margin: 0;
            padding-left: 16px;
            color: var(--vscode-textBlockQuote-foreground);
          }
          a {
            color: var(--vscode-textLink-foreground);
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background: var(--vscode-list-hoverBackground);
          }
          img {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        ${result.html}
      </body>
      </html>
    `;

    if (result.errors.length > 0) {
      vscode.window.showWarningMessage(
        `Parse warnings: ${result.errors.length} issues found`
      );
    }
  });

  // Export HTML command
  const exportCommand = vscode.commands.registerCommand('marknext.exportHtml', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    const source = document.getText();
    const result = compile(source, { pretty: true });

    // Get output path
    const outputPath = document.fileName.replace(/\.mnext$|\.mn$/, '.html');
    const uri = vscode.Uri.file(outputPath);

    try {
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(result.html, 'utf-8')
      );
      vscode.window.showInformationMessage(
        `Exported to ${outputPath.split('/').pop()}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
  });

  context.subscriptions.push(previewCommand, exportCommand);
}

export function deactivate() {}
