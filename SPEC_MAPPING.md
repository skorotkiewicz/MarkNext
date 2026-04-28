# MarkNext Implementation ↔ Specification Mapping

## Overview

| File | Role | Lines | Description |
|------|------|-------|-------------|
| `src/tokens.ts` | Lexical Tokens | 80 | TokenType enum + Token/Position interfaces |
| `src/lexer.ts` | Lexer | 290 | Tokenizer implementing EBNF lexical rules |
| `src/ast.ts` | AST Nodes | 203 | TypeScript type definitions for all grammar nodes |
| `src/parser.ts` | Parser | ~1250 | Recursive descent parser implementing EBNF grammar |
| `src/renderer.ts` | HTML Renderer | ~315 | AST → HTML transformer |
| `src/index.ts` | API + Pipeline | ~90 | `compile()` / `compileSync()` / `compileFile()` |
| `src/cli.ts` | CLI Tool | ~470 | Command-line interface |
| `src/config.ts` | Config Loader | ~100 | `marknext.toml` TOML subset parser |

---

## 1. EBNF Grammar → Source Code Mapping

### Lexical Tokens (`grammar.ebnf` §1)

| EBNF Rule | `tokens.ts` | `lexer.ts` | Status |
|-----------|-------------|------------|--------|
| `letter`, `digit` | — | `readText()` uses regex | ✅ Implicit |
| `space` | `TokenType.SPACE` | Lines 45-49 | ✅ |
| `newline` | `TokenType.NEWLINE` | Lines 38-43 | ✅ |
| `whitespace` | — | `skipWhitespace()` | ✅ |
| `star` | `TokenType.STAR` | Lines 65-68 | ✅ |
| `slash` | `TokenType.SLASH` | Lines 70-73 | ✅ |
| `backtick` | `TokenType.BACKTICK` | Lines 75-78 | ✅ |
| `open/close_bracket` | `LBRACKET`/`RBRACKET` | Lines 80-88 | ✅ |
| `open/close_paren` | `LPAREN`/`RPAREN` | Lines 90-98 | ✅ |
| `exclaim` | `TokenType.EXCLAIM` | Lines 100-103 | ✅ |
| `hash` | `TokenType.HASH` | Lines 51-58 | ✅ |
| `dash` | `TokenType.DASH` | Lines 60-63 | ✅ |
| `pipe` | `TokenType.PIPE` | Lines 115-118 | ✅ |
| `greater` | `TokenType.GT` | Lines 105-113 | ✅ |
| `backslash` | `TokenType.BACKSLASH` | Lines 120-123 | ✅ |
| `period` | `TokenType.PERIOD` | Lines 125-128 | ✅ |
| `lt` / `gt` | `LT` / `GT_SYMBOL` | Lines 130-134 | ✅ |
| `underscore` | `TokenType.UNDERSCORE` | Lines 136-139 | ✅ |
| `colon` | `TokenType.COLON` | Lines 141-144 | ✅ |
| `equals` | `TokenType.EQUALS` | Lines 146-149 | ✅ |
| `dquote` | `TokenType.DQUOTE` | Lines 151-154 | ✅ |
| `caret` | `TokenType.CARET` | Lines 156-159 | ✅ |
| `dollar` | `TokenType.DOLLAR` | Lines 161-164 | ✅ |
| `any_char` | `TokenType.TEXT` | Lines 168-170 | ✅ |

**Note:** Lexer distinguishes `GT` (blockquote marker `>`) from `GT_SYMBOL` (URL closer `>` after `<`) via `inAngleUrl` state flag — documented in EBNF §"Lexer Implementation Notes".

---

### Document Structure (`grammar.ebnf` §2)

| EBNF Rule | Implementation | File | Lines | Status |
|-----------|---------------|------|-------|--------|
| `document = {blank_line}, {block}, {blank_line}, EOF` | `Parser.parse()` | `parser.ts` | 25-41 | ✅ |
| `blank_line` | `skipBlankLines()` | `parser.ts` | 80-101 | ✅ |
| `block` (all variants) | `parseBlock()` dispatch | `parser.ts` | 103-149 | ✅ |
| `header` | `parseHeader()` | `parser.ts` | 156-178 | ✅ |
| `paragraph` | `parseParagraph()` | `parser.ts` | 397-433 | ✅ |
| `list` | `parseList()` / `parseListAtIndent()` | `parser.ts` | 249-312 | ✅ |
| `code_block` | `parseCodeBlock()` | `parser.ts` | 180-216 | ✅ |
| `blockquote` | `parseBlockquote()` | `parser.ts` | 218-247 | ✅ |
| `thematic_break` | `parseThematicBreak()` | `parser.ts` | 151-154 | ✅ |
| `table` | `parseTable()` | `parser.ts` | 984-1007 | ✅ |
| `footnote_definition` | `parseFootnoteDefinition()` | `parser.ts` | 919-982 | ✅ |
| `math_block` | `parseMathBlock()` | `parser.ts` | 895-917 | ✅ |

---

### Inline Elements (`grammar.ebnf` §3)

| EBNF Rule | Implementation | File | Lines | Status |
|-----------|---------------|------|-------|--------|
| `inline_content` | `parseInlineUntilNewline()` | `parser.ts` | 1099-1108 | ✅ |
| `inline_element` | `parseInline()` dispatch | `parser.ts` | 435-523 | ✅ |
| `text_span` | Text branch in `parseInline()` | `parser.ts` | 496-515 | ✅ |
| `bold = star, inline_content, star` | `parseBold()` | `parser.ts` | 525-541 | ✅ |
| `italic = slash, inline_content, slash` | `parseItalic()` | `parser.ts` | 543-559 | ✅ |
| `code_inline` | `parseCode()` | `parser.ts` | 561-574 | ✅ |
| `link` | `parseLink()` | `parser.ts` | 576-636 | ✅ |
| `angle_url = lt, link_url, gt` | `<url>` path in `parseLink()` | `parser.ts` | 601-608 | ✅ |
| `image = exclaim, link` | `parseImage()` | `parser.ts` | 638-696 | ✅ |
| `line_break = backslash, newline` | `parseInline()` backslash branch | `parser.ts` | 474-479 | ✅ |
| `escaped_char` | `parseEscape()` | `parser.ts` | 702-726 | ✅ |
| `footnote` | `parseFootnote()` | `parser.ts` | 728-743 | ✅ |
| `shortcode` | `parseShortcode()` / `isShortcode()` | `parser.ts` | 745-819 | ✅ |
| `math` | `parseMath()` | `parser.ts` | 821-852 | ✅ |
| `auto_link` | `parseAutoLink()` / `isAutoLink()` | `parser.ts` | 854-893 | ✅ |

---

### Lists (`grammar.ebnf` §4)

| EBNF Rule | Implementation | File | Lines | Status |
|-----------|---------------|------|-------|--------|
| `list = list_items, {blank_line}` | `parseList()` | `parser.ts` | 249-312 | ✅ |
| `list_items` | Loop in `parseListAtIndent()` | `parser.ts` | 263-309 | ✅ |
| `list_item = marker, ws, inline_content, [continuation], [sublist]` | `parseListItem()` | `parser.ts` | 340-395 | ✅ |
| `unordered_marker = dash` | `DASH` check | `parser.ts` | 302-305 | ✅ |
| `ordered_marker = digit, {digit}, period` | `isOrderedListMarker()` | `parser.ts` | 1111-1115 | ✅ |
| `continuation = {newline, indent, inline_content}` | Continuation loop in `parseListItem()` | `parser.ts` | 366-391 | ✅ |
| `sublist = newline, indent, list` | Sublist detection in `parseListAtIndent()` | `parser.ts` | 275-283 | ✅ |
| `indent = space, space, {space}` | `countIndent()` | `parser.ts` | 314-320 | ✅ |

---

### Tables (`grammar.ebnf` §5)

| EBNF Rule | Implementation | File | Lines | Status |
|-----------|---------------|------|-------|--------|
| `table = table_header, newline, table_separator, {newline, table_row}` | `parseTable()` | `parser.ts` | 984-1007 | ✅ |
| `table_header / table_row` | `parseTableRow()` | `parser.ts` | 1056-1097 | ✅ |
| `table_cell` | Cell content parsing in `parseTableRow()` | `parser.ts` | 1066-1084 | ✅ |
| `table_separator` | `parseTableSeparator()` | `parser.ts` | 1009-1054 | ✅ |
| `align_marker` (4 variants) | Colon+dash detection | `parser.ts` | 1020-1041 | ✅ |

---

### Code Blocks (`grammar.ebnf` §6)

| EBNF Rule | Implementation | File | Lines | Status |
|-----------|---------------|------|-------|--------|
| `code_block = fence, [language], newline, body, fence` | `parseCodeBlock()` | `parser.ts` | 180-216 | ✅ |
| `code_fence` (```) | `TokenType.CODE_FENCE` | `lexer.ts` | 24-27 | ✅ |
| `language = letter, {letter\|digit\|dash\|underscore}` | Language identifier parse | `parser.ts` | 186-191 | ✅ |

---

## 2. SPEC.md Requirements → Implementation Mapping

### §2 Design Decisions (One Syntax Per Feature)

| Spec Requirement | Implementation Evidence | Status |
|-----------------|------------------------|--------|
| `*text*` bold only | `parseBold()` uses single `STAR` | ✅ |
| `/text/` italic only | `parseItalic()` uses `SLASH` | ✅ |
| `*/text/*` or `/*text*/` bold+italic | Nesting supported via recursive `parseInline()` | ✅ |
| `#` ATX headers only | `parseHeader()` rejects Setext; `checkThematicBreak` separate | ✅ |
| `-` unordered lists only | `DASH` marker; `*` never used for lists | ✅ |
| Manual ordered list numbers | `ordered_marker` preserved via `ListItem.number` + `start`/`value` attrs | ✅ |
| `` `code` `` inline | `parseCode()` | ✅ |
| ````lang` fenced code blocks | `parseCodeBlock()` | ✅ |
| `>` blockquotes | `parseBlockquote()` | ✅ |
| `[text](url)` direct links only | `parseLink()` — no reference link support | ✅ |
| `![alt](url)` images | `parseImage()` | ✅ |
| `---` horizontal rule only | `checkThematicBreak()` + `THEMATIC_BREAK` token | ✅ |
| `\` hard line breaks | `parseInline()` backslash branch | ✅ |

### §4 Syntax Reference

| Spec Section | Parser Method | Renderer Method | Status |
|-------------|---------------|-----------------|--------|
| 4.1 Headers | `parseHeader()` | `renderHeader()` | ✅ |
| 4.2 Emphasis | `parseBold()` / `parseItalic()` | `renderBold()` / `renderItalic()` | ✅ |
| 4.3 Lists | `parseList()` | `renderList()` / `renderListItem()` | ✅ |
| 4.4 Code | `parseCode()` / `parseCodeBlock()` | `renderCode()` / `renderCodeBlock()` | ✅ |
| 4.5 Links | `parseLink()` / `parseAutoLink()` | `renderLink()` | ✅ |
| 4.6 Blockquotes | `parseBlockquote()` | `renderBlockquote()` | ✅ |
| 4.7 Tables | `parseTable()` | `renderTable()` | ✅ |
| 4.8 Thematic Break | `parseThematicBreak()` | `renderThematicBreak()` | ✅ |

### §5 Security Model

| Spec Requirement | Implementation | Status |
|-----------------|---------------|--------|
| No inline HTML | No HTML token type; renderer escapes all output | ✅ |
| Safe shortcodes | `parseShortcode()` schema-only parsing | ✅ |
| Compile-time only | `compile()` / `compileSync()` — no runtime eval | ✅ |

### §6 Compilation Pipeline

| Spec Stage | Implementation | File | Status |
|-----------|---------------|------|--------|
| [1] Pre-processing hooks | `CompileOptions.hooks.pre` | `index.ts` | ✅ |
| [2] Tokenization (lexer) | `Lexer.tokenize()` | `lexer.ts` | ✅ |
| [3] Parsing (CFG grammar) | `Parser.parse()` | `parser.ts` | ✅ |
| [4] Extension processing | Partial (shortcodes, math, footnotes) | `parser.ts` | ⚠️ |
| [5] AST transformation | Direct render, no separate transform stage | — | ⚠️ |
| [6] Rendering | `HTMLRenderer.render()` | `renderer.ts` | ✅ |
| [7] Post-processing hooks | `CompileOptions.hooks.post` | `index.ts` | ✅ |

---

## 3. AST ↔ EBNF Node Mapping

| EBNF Non-Terminal | TypeScript Interface | File | Lines |
|-------------------|---------------------|------|-------|
| `document` | `Document` | `ast.ts` | 38-42 |
| `header` | `Header` | `ast.ts` | 55-59 |
| `paragraph` | `Paragraph` | `ast.ts` | 61-64 |
| `list` | `List` | `ast.ts` | 66-70 |
| `list_item` | `ListItem` | `ast.ts` | 72-76 |
| `code_block` | `CodeBlock` | `ast.ts` | 78-82 |
| `blockquote` | `Blockquote` | `ast.ts` | 84-87 |
| `thematic_break` | `ThematicBreak` | `ast.ts` | 89-91 |
| `table` | `Table` | `ast.ts` | 93-98 |
| `table_row` | `TableRow` | `ast.ts` | 100-104 |
| `table_cell` | `TableCell` | `ast.ts` | 106-110 |
| `emphasis_bold` | `Bold` | `ast.ts` | 153-156 |
| `emphasis_italic` | `Italic` | `ast.ts` | 158-161 |
| `code_inline` | `Code` | `ast.ts` | 163-166 |
| `link` | `Link` | `ast.ts` | 168-173 |
| `image` | `Image` | `ast.ts` | 175-180 |
| `line_break` | `LineBreak` | `ast.ts` | 182-184 |
| `escaped_char` | `Escape` | `ast.ts` | 186-189 |
| `footnote` | `Footnote` | `ast.ts` | 112-115 |
| `footnote_definition` | `FootnoteDefinition` | `ast.ts` | 117-121 |
| `math` | `Math` | `ast.ts` | 123-127 |
| `math_block` | `MathBlock` | `ast.ts` | 129-132 |
| `shortcode` | `Shortcode` | `ast.ts` | 191-195 |
| `text_span` | `Text` | `ast.ts` | 148-151 |

---

## 4. CLI ↔ QUICKREF.md Mapping

| QUICKREF Command | CLI Implementation | File | Lines |
|-----------------|-------------------|------|-------|
| `marknext doc.mnext` | `main()` file path | `cli.ts` | 381-416 | ✅ |
| `marknext doc.mnext -o dist/` | `-o, --output` option | `cli.ts` | 79-82 | ✅ |
| `marknext doc.mnext -s` | `--standalone` wrap | `cli.ts` | 185-270 | ✅ |
| `marknext doc.mnext -w` | `watchFile()` / `watchDirectory()` | `cli.ts` | 331-379 | ✅ |
| `marknext doc.mnext -f json` | `format === 'json'` branch | `cli.ts` | 179-181 | ✅ |
| `marknext docs/ -r` | `recursive` + `findFiles()` | `cli.ts` | 149-164 | ✅ |
| `marknext migrate doc.md doc.mnext` | `migrateFile()` | `cli.ts` | 383-436 | ✅ |

---

## 5. Configuration ↔ SPEC.md §6.1 Mapping

| TOML Section | Interface Path | Parser | Status |
|-------------|---------------|--------|--------|
| `[build]` | `MarkNextConfig.build` | `parseConfig()` | ✅ |
| `[extensions]` | `MarkNextConfig.extensions` | `parseConfig()` | ✅ |
| `[hooks]` | `MarkNextConfig.hooks` | `parseConfig()` | ✅ |
| `[shortcodes]` | `MarkNextConfig.shortcodes` | `parseConfig()` | ✅ |
| `[compatibility]` | `MarkNextConfig.compatibility` | `parseConfig()` | ✅ |
| `loadConfig()` | Async file reader | `config.ts` | ✅ |

---

## 6. Deviations & Gaps (Post v1.0.3)

### Resolved in v1.0.3
- **Build configuration (`marknext.toml`)**: `src/config.ts` added with TOML subset parser.
- **Pre/post processing hooks**: `CompileOptions.hooks.pre/post` integrated into `compile()`.
- **Source maps**: All AST nodes now carry `position` populated from lexer tokens.
- **Migration command**: `marknext migrate input.md output.mnext` added to CLI.
- **Compatibility mode**: `strict` / `warn` / `legacy` modes added to `Parser`.
- **Ordered list numbering**: Renderer emits `start` on `<ol>` and `value` on `<li>`.
- **Shortcode param values without quotes**: Now enforced to require `dquote` per EBNF; unquoted triggers `compatIssue`.

### Remaining gaps
- **Extension isolation / separate process**: Security requirement not enforced.
- **Streaming input**: Spec §11 requirement "Support streaming input" — lexer loads entire string.
- **Source map propagation to renderer**: Positions exist on AST but are not emitted into HTML output.
- **Extension registry packages**: `marknext-ext-tables`, etc. not implemented.

### Minor spec compliance notes
- **Header closing hashes**: Spec shows `# Like This ##`; parser consumes them but doesn't validate count matches opening.
- **Math rendering**: Renderer emits `data-latex` attributes, not MathML or KaTeX as spec suggests for extensions.
- **Auto-link validation**: `isAutoLink()` checks URL scheme (`https?`, `ftp`, `mailto`). EBNF just says `link_url`.
