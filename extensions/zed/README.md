# MarkNext for Zed

Syntax highlighting for MarkNext in Zed editor.

## Features

- Full syntax highlighting for MarkNext files
- Bracket auto-closing for `[]`, `()`, ```` ``` ````, `` ` ``, `*`, `/`
- Support for `.mnext` and `.mn` file extensions

## Installation

1. Copy this folder to Zed's extensions directory:
   ```bash
   # macOS
   cp -r extensions/zed ~/Library/Application\ Support/Zed/extensions/marknext
   
   # Linux
   cp -r extensions/zed ~/.config/zed/extensions/marknext
   ```

2. Restart Zed

## Supported Syntax

### Emphasis
- **Bold**: `*text*` - renders as bold
- *Italic*: `/text/` - renders as italic
- */Bold Italic/*: `*/text/*` or `/*text*/`

### Code
- Inline: `` `code` ``
- Block: ```` ```language ... ``` ````

### Lists
- Unordered: `- item`
- Ordered: `1. item`

### Links & Images
- Link: `[text](url)`
- Image: `![alt](url)`

### Other
- Headers: `#` through `######`
- Blockquotes: `> quote`
- Tables: `| col1 | col2 |`
- Shortcodes: `[tag attr="value"]`

## Release Notes

### 1.0.0

- Initial release
- Full MarkNext syntax highlighting
- Bracket auto-closing
