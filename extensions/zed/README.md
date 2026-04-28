# MarkNext for Zed

Syntax highlighting and language support for MarkNext in the Zed editor.

## Features

- Full syntax highlighting for MarkNext files
- Bracket auto-closing for `[]`, `()`, ```` ``` ````, `` ` ``, `*`, `/`, `[^`, `$$`
- Support for `.mnext` and `.mn` file extensions
- Footnotes and math expression highlighting
- Code block language injection
- Document outline (headings)
- Vim text objects support

## Directory Structure

```
marknext/
  extension.toml           # Extension manifest
  languages/
    marknext/
      config.toml          # Language configuration
      highlights.scm       # Syntax highlighting queries
      brackets.scm         # Bracket matching
      injections.scm       # Code block language injection
      indents.scm          # Indentation rules
      outline.scm          # Document outline
      textobjects.scm      # Vim text objects
```

## Installation (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/skorotkiewicz/marknext.git
   ```

2. Install as a dev extension in Zed:
   - Open Zed
   - Go to Extensions page
   - Click "Install Dev Extension"
   - Select the `extensions/zed` directory

3. Restart Zed

## Installation (Published - Coming Soon)

Once published to the Zed extension registry:

1. Open Zed
2. Go to Extensions page
3. Search for "MarkNext"
4. Click Install

## Publishing

To publish this extension to the Zed registry:

1. Fork [zed-industries/extensions](https://github.com/zed-industries/extensions)
2. Add this repo as a submodule:
   ```bash
   git submodule add https://github.com/skorotkiewicz/marknext.git extensions/marknext
   ```
3. Add entry to `extensions.toml`:
   ```toml
   [marknext]
   submodule = "extensions/marknext"
   version = "1.0.0"
   path = "extensions/zed"
   ```
4. Open a PR

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

### Footnotes & Math
- Footnote reference: `[^1]`
- Footnote definition: `[^1]: Note text`
- Inline math: `$E=mc^2$`
- Math block: `$$...$$`

### Other
- Headers: `#` through `######`
- Blockquotes: `> quote`
- Tables: `| col1 | col2 |`
- Shortcodes: `[tag attr="value"]`

## Extension Manifest

This extension follows the Zed extension format with an `extension.toml` manifest:

```toml
id = "marknext"
name = "MarkNext"
version = "1.0.0"
schema_version = 1
authors = ["Sebastian Korotkiewicz"]
description = "MarkNext language support for Zed"
repository = "https://github.com/skorotkiewicz/marknext"
```

## Release Notes

### 1.0.0

- Initial release
- Full MarkNext syntax highlighting
- Bracket auto-closing
- Code injection support
- Document outline
- Vim text objects
