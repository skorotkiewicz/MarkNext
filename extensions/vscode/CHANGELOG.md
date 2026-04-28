# Change Log

All notable changes to the MarkNext VS Code extension will be documented in this file.

## [1.0.3] - 2026-04-28

### Added
- Standalone HTML export command (`MarkNext: Export to Standalone HTML`)
- Live preview auto-refresh on document changes
- Error banner in preview panel showing parse warnings with line/column info
- Configuration options for compatibility mode (`strict`/`warn`/`legacy`) and source maps
- File icons for `.mnext` and `.mn` files
- Explorer context menu export action
- Keybinding `Ctrl+Shift+V` / `Cmd+Shift+V` for preview

### Fixed
- **Critical**: Extension failed to run when packaged because `out/` was incorrectly excluded from `.vsix`
- **Critical**: Extension imported source files outside its directory; now bundled with esbuild/bun
- Removed HTML from `embeddedLanguages` (MarkNext prohibits inline HTML per security model)
- Updated VS Code engine requirement to `^1.74.0`
- Fixed `language-configuration.json` folding markers and auto-close behavior

## [1.0.0] - 2026-04-27

### Added
- Initial release
- Syntax highlighting for all MarkNext features (headers, emphasis, lists, code, links, images, tables, blockquotes, footnotes, math, shortcodes)
- Live preview panel
- Export to HTML command
