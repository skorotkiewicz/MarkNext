import * as vscode from 'vscode';
import * as path from 'path';
import { compile, type CompileOptions } from '../../src/index';

function getCompileOptions(): CompileOptions {
  const config = vscode.workspace.getConfiguration('marknext.preview');
  return {
    pretty: true,
    sourceMap: config.get<boolean>('sourceMap', false),
    compatibility: config.get<'strict' | 'warn' | 'legacy'>('compatibility', 'strict'),
  };
}

function getPreviewHtml(content: string, document: vscode.TextDocument): string {
  const config = vscode.workspace.getConfiguration('marknext.preview');
  const theme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light';

  // Get vscode CSS variables for theming
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https: http:;">
  <style>
    :root {
      --fg: var(--vscode-foreground, #333);
      --bg: var(--vscode-editor-background, #fff);
      --link: var(--vscode-textLink-foreground, #0066cc);
      --code-bg: var(--vscode-textCodeBlock-background, #f4f4f4);
      --border: var(--vscode-panel-border, #ddd);
      --quote-border: var(--vscode-textBlockQuote-border, #ddd);
      --quote-fg: var(--vscode-textBlockQuote-foreground, #666);
      --title: var(--vscode-titleBar-activeForeground, #222);
      --hover: var(--vscode-list-hoverBackground, #f8f8f8);
    }
    [data-theme="dark"] {
      --fg: #e0e0e0;
      --bg: #1e1e1e;
      --link: #4ea8f5;
      --code-bg: #2d2d2d;
      --border: #444;
      --quote-border: #555;
      --quote-fg: #aaa;
      --title: #fff;
      --hover: #2a2a2a;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: var(--fg);
      background: var(--bg);
    }
    h1, h2, h3, h4, h5, h6 {
      color: var(--title);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.3em;
      margin-top: 1.5em;
    }
    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    code {
      background: var(--code-bg);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, Inconsolata, 'Fira Code', monospace;
      font-size: 0.9em;
    }
    pre {
      background: var(--code-bg);
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid var(--quote-border);
      margin: 0;
      padding-left: 16px;
      color: var(--quote-fg);
    }
    a {
      color: var(--link);
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: var(--hover);
      font-weight: 600;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    ul, ol { padding-left: 2em; }
    .math {
      font-family: 'Latin Modern Math', 'STIX Two Math', serif;
    }
    .math.block {
      text-align: center;
      margin: 1em 0;
    }
    .footnotes {
      margin-top: 2em;
      padding-top: 1em;
      border-top: 1px solid var(--border);
    }
    .footnote {
      font-size: 0.9em;
      margin-bottom: 0.5em;
    }
    .footnote-ref {
      font-size: 0.8em;
      vertical-align: super;
    }
    .shortcode {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--code-bg);
      border: 1px solid var(--border);
    }
    .error-banner {
      background: var(--vscode-inputValidation-warningBackground, #fff3cd);
      color: var(--vscode-inputValidation-warningForeground, #856404);
      border: 1px solid var(--vscode-inputValidation-warningBorder, #ffc107);
      padding: 10px 15px;
      border-radius: 4px;
      margin-bottom: 1em;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

export function activate(context: vscode.ExtensionContext) {
  let currentPanel: vscode.WebviewPanel | undefined;

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
    const options = getCompileOptions();
    const result = compile(source, options);

    // Error banner
    let errorBanner = '';
    if (result.errors.length > 0) {
      const errorList = result.errors.slice(0, 5).map(e =>
        `Line ${e.line}:${e.column} — ${e.message}`
      ).join('<br>');
      const more = result.errors.length > 5 ? `<br>...and ${result.errors.length - 5} more` : '';
      errorBanner = `<div class="error-banner"><strong>${result.errors.length} parse issue(s):</strong><br>${errorList}${more}</div>`;
    }

    const htmlBody = errorBanner + result.html;

    // Reuse existing panel or create new one
    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.Two);
      currentPanel.webview.html = getPreviewHtml(htmlBody, document);
      currentPanel.title = `Preview: ${path.basename(document.fileName)}`;
    } else {
      currentPanel = vscode.window.createWebviewPanel(
        'marknextPreview',
        `Preview: ${path.basename(document.fileName)}`,
        vscode.ViewColumn.Two,
        { enableScripts: false } // Keep false for security (no inline HTML in MarkNext anyway)
      );

      currentPanel.webview.html = getPreviewHtml(htmlBody, document);

      currentPanel.onDidDispose(() => {
        currentPanel = undefined;
      }, null, context.subscriptions);
    }

    if (result.errors.length > 0) {
      vscode.window.showWarningMessage(
        `MarkNext: ${result.errors.length} parse issue(s) found. See preview panel for details.`
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
    const options = getCompileOptions();
    const result = compile(source, options);

    const outputPath = document.fileName.replace(/\.mnext$|\.mn$/i, '.html');
    const uri = vscode.Uri.file(outputPath);

    try {
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(result.html, 'utf-8')
      );
      vscode.window.showInformationMessage(
        `Exported to ${path.basename(outputPath)}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
  });

  // Export standalone HTML command
  const exportStandaloneCommand = vscode.commands.registerCommand('marknext.exportHtmlStandalone', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    const source = document.getText();
    const options = getCompileOptions();
    const result = compile(source, options);

    const outputPath = document.fileName.replace(/\.mnext$|\.mn$/i, '.standalone.html');
    const uri = vscode.Uri.file(outputPath);

    const standalone = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${path.basename(document.fileName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 20px; color: #333; background: #fff; }
    h1, h2, h3, h4, h5, h6 { color: #222; border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'SF Mono', Monaco, Inconsolata, 'Fira Code', monospace; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
    a { color: #0066cc; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f8f8f8; }
    img { max-width: 100%; height: auto; }
    .footnotes { margin-top: 2em; padding-top: 1em; border-top: 1px solid #ddd; }
    .footnote { font-size: 0.9em; margin-bottom: 0.5em; }
    .footnote-ref { font-size: 0.8em; vertical-align: super; }
    .math { font-family: 'Latin Modern Math', 'STIX Two Math', serif; }
    .math.block { text-align: center; margin: 1em 0; }
  </style>
</head>
<body>
${result.html}
</body>
</html>`;

    try {
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(standalone, 'utf-8')
      );
      vscode.window.showInformationMessage(
        `Exported standalone HTML to ${path.basename(outputPath)}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
  });

  // Watch for document changes and update preview
  const changeListener = vscode.workspace.onDidChangeTextDocument(event => {
    if (currentPanel && event.document.languageId === 'marknext') {
      const source = event.document.getText();
      const options = getCompileOptions();
      const result = compile(source, options);
      let errorBanner = '';
      if (result.errors.length > 0) {
        const errorList = result.errors.slice(0, 5).map(e =>
          `Line ${e.line}:${e.column} — ${e.message}`
        ).join('<br>');
        const more = result.errors.length > 5 ? `<br>...and ${result.errors.length - 5} more` : '';
        errorBanner = `<div class="error-banner"><strong>${result.errors.length} parse issue(s):</strong><br>${errorList}${more}</div>`;
      }
      currentPanel.webview.html = getPreviewHtml(errorBanner + result.html, event.document);
    }
  });

  context.subscriptions.push(
    previewCommand,
    exportCommand,
    exportStandaloneCommand,
    changeListener
  );
}

export function deactivate() {}
