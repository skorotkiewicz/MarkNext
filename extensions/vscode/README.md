# MarkNext VS Code Extension

Syntax highlighting and preview support for MarkNext files.

## Features

- **Syntax Highlighting**: Full support for MarkNext syntax including:
  - Headers (`#` to `######`)
  - Bold (`*text*`)
  - Italic (`/text/`)
  - Code blocks (```language)
  - Lists (`-` unordered, `1.` ordered)
  - Links (`[text](url)`)
  - Images (`![alt](url)`)
  - Tables (pipe syntax)
  - Blockquotes (`>`)
  - **Footnotes** (`[^1]` references and `[^1]: definition`)
  - **Math** (`$...$` inline and `$$...$$` block)
  - Shortcodes (`[tag attr="value"]`)

- **Live Preview**: Press `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows/Linux) to open a preview panel

- **Export to HTML**: Right-click menu to export to HTML

## Usage

1. Open a `.mnext` or `.mn` file
2. Syntax highlighting is automatic
3. Use the preview button in the top-right or press the keyboard shortcut
4. Export with right-click → "Export to HTML"

## Installation

```bash
# Install from VSIX
code --install-extension marknext-1.0.0.vsix

# Or install from marketplace (when published)
code --install-extension marknext
```

## Keyboard Shortcuts

| Command | Shortcut |
|---------|----------|
| Preview MarkNext | `Ctrl+Shift+V` |
| Export to HTML | - |

## Requirements

- VS Code 1.60.0 or higher

## Extension Settings

- `marknext.preview.enable`: Enable/disable preview (default: true)

## Release Notes

### 1.0.0

- Initial release
- Syntax highlighting for all MarkNext features
- Preview and export functionality
