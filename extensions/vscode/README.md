# MarkNext VS Code Extension

Syntax highlighting, live preview, and export support for MarkNext files.

## Features

### Syntax Highlighting
Full TextMate grammar support for MarkNext syntax:
- Headers (`#` to `######`)
- Bold (`*text*`)
- Italic (`/text/`)
- Code blocks (```` ```language ````)
- Lists (`-` unordered, `1.` ordered)
- Links (`[text](url)`)
- Images (`![alt](url)`)
- Tables (pipe syntax)
- Blockquotes (`>`)
- Footnotes (`[^1]` references and `[^1]: definition`)
- Math (`$...$` inline and `$$...$$` block)
- Shortcodes (`[tag attr="value"]`)
- Auto-links (`<https://...>`)
- Escape sequences (`\*`, `\/` etc.)

### Live Preview
- Press `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (Mac) to open a live preview panel
- Preview updates automatically as you type
- Parse warnings are shown inline in the preview with line/column information
- Themed to match your VS Code color theme (light/dark)

### Export
- **Export to HTML**: Raw HTML fragment (useful for embedding)
- **Export to Standalone HTML**: Full HTML document with embedded CSS
- Access via Command Palette (`Ctrl+Shift+P`) or right-click in the file explorer

## Installation

### From VSIX
```bash
code --install-extension marknext-1.0.3.vsix
```

### From Marketplace (when published)
```bash
code --install-extension marknext
```

### Development
1. Open this folder in VS Code (`extensions/vscode/`)
2. Press `F5` to launch the Extension Development Host
3. Open a `.mnext` or `.mn` file to test

## Building

Requires [Node.js](https://nodejs.org/) or [Bun](https://bun.sh/):

```bash
cd extensions/vscode
npm install
npm run build
```

This bundles the extension code together with the MarkNext parser library into `out/extension.js`.

To package for distribution:
```bash
npx vsce package
```

## Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `marknext.preview.enable` | boolean | `true` | Enable live preview |
| `marknext.preview.compatibility` | string | `"strict"` | Parsing mode: `strict`, `warn`, or `legacy` |
| `marknext.preview.sourceMap` | boolean | `false` | Include source map data in output |

## Keyboard Shortcuts

| Command | Shortcut |
|---------|----------|
| Preview MarkNext | `Ctrl+Shift+V` / `Cmd+Shift+V` |
| Export to HTML | (Command Palette) |
| Export to Standalone HTML | (Command Palette) |

## File Associations

The extension automatically activates for files with these extensions:
- `.mnext`
- `.mn`

## Requirements

- VS Code 1.74.0 or higher
- Node.js 18+ or Bun 1.0+ (for building from source)

## Security Note

MarkNext intentionally prohibits inline HTML to prevent XSS vulnerabilities. The VS Code extension respects this by:
- Not including `html` in embedded language support
- Using a strict Content Security Policy in the preview webview
- Keeping `enableScripts: false` in the preview panel

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for full release history.

## License

MIT - See the main [LICENSE](../../LICENSE) file.
