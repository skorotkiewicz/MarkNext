# MarkNext Specification v1.0

**A Minimal, Unambiguous, and Secure Markdown Successor**

---

## 1. Philosophy

MarkNext follows the "worse is better" principle: prioritize simplicity, readability, and safety over feature completeness. It keeps what makes Markdown great (minimal friction, readable raw text) while eliminating ambiguities, security risks, and implementation complexity.

### Core Tenets

1. **One Way To Do Things** - No duplicate syntaxes for the same output
2. **Context-Free Grammar** - Strict CFG, no context-sensitive features in core
3. **Safe by Default** - No inline HTML, sandboxed extensibility only
4. **Readable Raw Text** - Source should be as legible as rendered output
5. **Formal Specification** - Complete EBNF grammar, no "implementation defined"

---

## 2. Design Decisions (One Syntax Per Feature)

| Feature | Markdown (Multiple Ways) | MarkNext (One Way) |
|---------|-------------------------|-------------------|
| **Bold** | `**text**` or `__text__` | `*text*` |
| **Italic** | `*text*` or `_text_` | `/text/` |
| **Bold+Italic** | `***text***` or `___text___` | `*/text/*` or `/*text*/` |
| **Header L1** | `#` or `====` under | `# text` |
| **Header L2** | `##` or `----` under | `## text` |
| **Header L3-L6** | `###` - `######` | `###` - `######` |
| **Unordered List** | `*`, `-`, `+` | `-` only |
| **Ordered List** | `1.` (auto renumbers) | `1.`, `2.`, `3.` (manual) |
| **Code Inline** | `` `text` `` | `` `text` `` |
| **Code Block** | `` ``` `` or indent 4 spaces | `` ```lang `` only |
| **Quote** | `>` | `>` (kept - good convention) |
| **Link** | `[text](url)` or ref style | `[text](url)` only |
| **Image** | `![alt](url)` or ref style | `![alt](url)` only |
| **Horizontal Rule** | `---`, `***`, `___` | `---` only |
| **Line Break** | Two spaces + newline | `\` at end of line |

---

## 3. Formal Grammar (EBNF)

```ebnf
(* Basic tokens *)
EOF          = "end of file";
NEWLINE      = "\n" | "\r\n";
SPACE        = " " | "\t";
WHITESPACE   = { SPACE };
TEXT         = { any character except special };

(* Document structure *)
document     = { block }, EOF;
block        = header 
             | paragraph 
             | list 
             | code_block 
             | blockquote 
             | thematic_break 
             | table;

(* Headers - ATX style only *)
header       = header_prefix, WHITESPACE, inline_content, [ header_suffix ], NEWLINE;
header_prefix= "#" | "##" | "###" | "####" | "#####" | "######";
header_suffix= WHITESPACE, ( "#" | "##" | "###" | "####" | "#####" | "######" );

(* Paragraphs *)
paragraph    = inline_content, { NEWLINE, inline_content }, NEWLINE;
inline_content= inline_element, { inline_element };
inline_element= text_span 
              | emphasis_bold 
              | emphasis_italic 
              | code_inline 
              | link 
              | image;

(* Emphasis *)
emphasis_bold    = "*", inline_content, "*";
emphasis_italic  = "/", inline_content, "/";

(* Code *)
code_inline      = "`", { any except "`" or NEWLINE }, "`";
code_block       = code_fence, [ language ], NEWLINE, code_content, code_fence;
code_fence       = "```";
language         = { letter | digit | "-" | "_" };
code_content     = { any character };

(* Lists - strict syntax *)
list             = list_item, { NEWLINE, list_item };
list_item        = list_marker, WHITESPACE, inline_content, [ sublist ];
list_marker      = unordered_marker | ordered_marker;
unordered_marker = "-";
ordered_marker   = digit, { digit }, ".";
sublist          = NEWLINE, indent, list;
indent           = { SPACE }, minimum 2;

(* Blockquotes *)
blockquote       = ">", WHITESPACE, block, { NEWLINE, ">", WHITESPACE, block };

(* Thematic break *)
thematic_break   = "---", [ "-" ], { "-" }, NEWLINE;

(* Links and images *)
link             = "[", link_text, "]", "(", link_target, ")";
link_text        = { any except "]" };
link_target      = url | "<", url, ">";
url              = { valid URL characters };

image            = "!", link;
image_alt        = link_text;

(* Tables - pipe syntax *)
table            = table_row, NEWLINE, table_separator, { NEWLINE, table_row };
table_row        = "|", table_cell, { "|", table_cell }, "|";
table_cell       = WHITESPACE, inline_content, WHITESPACE;
table_separator  = "|", table_align, { "|", table_align }, "|";
table_align      = WHITESPACE, ":" | "-" | ":-" | "-:" | ":-:", WHITESPACE;

(* Text spans *)
text_span        = { any character except special inline chars };
special_chars    = "*" | "/" | "`" | "[" | "!" | "\n" | "\\";

(* Escapes *)
escaped_char     = "\\", ( "\\" | "*" | "/" | "`" | "[" | "]" | "(" | ")" | "!" | "#" | "-" | ">" | "|" );

(* Hard line breaks *)
hard_break       = "\\", NEWLINE;
```

---

## 4. Syntax Reference

### 4.1 Headers

```markdown
# Level 1 Header
## Level 2 Header
### Level 3 Header
#### Level 4 Header
##### Level 5 Header
###### Level 6 Header

# Also Valid with Closing #
## Like This ##
```

**Rejected:** Setext-style underlines (`====` or `----`) removed to prevent ambiguity.

### 4.2 Emphasis

```markdown
*This is bold text*
/This is italic text/
*/This is bold italic/*
/*Also bold italic*/

*You can /nest/ emphasis*
/You can *nest* emphasis/
```

**Output:**
- `*text*` → `<strong>text</strong>`
- `/text/` → `<em>text</em>`
- `*/text/*` → `<strong><em>text</em></strong>`

**Rejected:** 
- `**` for bold (conflicts with list markers)
- `__` for underline (not semantic, use CSS if needed)
- `_` for italic (underscores common in identifiers)

### 4.3 Lists

**Unordered:**
```markdown
- First item
- Second item
  - Nested item (2+ space indent)
  - Another nested item
- Third item
```

**Ordered:**
```markdown
1. First item
2. Second item
3. Third item
   1. Nested ordered
   2. Another nested
4. Fourth item
```

**Important:** Ordered lists use the number you provide. No auto-renumbering.

**Rejected:**
- `*` for lists (conflicts with bold)
- `+` for lists (unnecessary alternative)

### 4.4 Code

**Inline:**
```markdown
Use `const x = 5` for constants
```

**Block:**
````markdown
```javascript
function hello() {
  return "world";
}
```
````

**Rejected:**
- Indented code blocks (4 spaces) - too easy to create accidentally

### 4.5 Links

**Direct links only:**
```markdown
[Link text](https://example.com)
[Link with title](https://example.com "Title")
<https://example.com> (auto-link)
```

**Rejected:**
- Reference-style links `[text][ref]` with definitions elsewhere
- These make grammar context-sensitive

### 4.6 Blockquotes

```markdown
> This is a quote
> spanning multiple lines
>> Nested quote
> Back to first level
```

### 4.7 Tables (Extension)

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

| Left  | Center | Right |
|:------|:------:|------:|
| A     | B      | C     |
```

### 4.8 Thematic Break

```markdown
---

Must be on its own line with 3+ dashes.
```

---

## 5. Security Model

### 5.1 No Inline HTML

MarkNext **prohibits inline HTML entirely**. This eliminates XSS vectors and sanitization complexity.

**Instead of dangerous HTML:**
```markdown
<!-- REJECTED - Not valid in MarkNext -->
<div class="warning">
  <script>alert('xss')</script>
  Dangerous content
</div>
```

**Use safe shortcodes:**
```markdown
[warning text="Safe warning message"]
```

### 5.2 Shortcode System

Shortcodes are the **only** way to extend formatting. They are:
- Parsed at compile-time
- Cannot contain executable code
- Defined by schema

```markdown
[alert type="warning" text="Don't do this"]
[button url="/download" label="Download Now"]
[math latex="E=mc^2"]
```

### 5.3 Extension Points (Safe)

Extensions are compile-time only, never runtime:

| Extension | Syntax | Output |
|-----------|--------|--------|
| Footnotes | `[^1]` + `[^1]: definition` | `<sup>` link + section |
| Math | `$E=mc^2$` or `$$...$$` | MathML or image |
| Diagrams | `!diagram(type, src)` | SVG |
| Citations | `[@key]` | Bibliography link |

---

## 6. Compilation Pipeline

MarkNext is **compiled**, not rendered at runtime.

```
Source (.mnext)
    ↓
[1] Pre-processing hooks
    ↓
[2] Tokenization (lexer)
    ↓
[3] Parsing (CFG grammar)
    ↓
[4] Extension processing
    ↓
[5] AST transformation
    ↓
[6] Rendering (HTML/PDF/Man/...)
    ↓
[7] Post-processing hooks
    ↓
Output (.html, .pdf, etc.)
```

### 6.1 Build Configuration

```toml
# marknext.toml
[build]
input = "docs/"
output = "dist/"
format = "html"

[extensions]
enable = ["tables", "footnotes", "math"]
math.renderer = "katex"

[hooks]
pre = "./scripts/preprocess.sh"
post = "./scripts/postprocess.sh"

[shortcodes]
warning = { template = "<div class='warning'>{{text}}</div>" }
```

---

## 7. Differences from CommonMark

| Aspect | CommonMark | MarkNext |
|--------|-----------|----------|
| **Grammar** | Context-sensitive | Strict CFG |
| **Bold** | `**` or `__` | `*` only |
| **Italic** | `*` or `_` | `/` only |
| **Headers** | ATX or Setext | ATX only |
| **Lists** | `*`, `-`, `+` | `-` only |
| **Links** | Direct or reference | Direct only |
| **HTML** | Allowed inline | **Prohibited** |
| **Line breaks** | 2 spaces or `\` | `\` only |
| **Footnotes** | Some variants | Extension only |
| **Build system** | None | First-class |

---

## 8. Rationale

### Why `/` for Italic?

- Visual: `/text/` looks slanted
- No conflict with identifiers (unlike `_variable_name`)
- No conflict with bold (unlike `*text*`)

### Why `*` for Bold?

- Tradition: asterisks used for emphasis for decades
- Single character for most common emphasis
- `**` removed to avoid list marker confusion

### Why Remove Reference Links?

Reference links `[text][id]` with `[id]: url` definitions:
- Make grammar context-sensitive
- Require two-pass parsing
- Often harder to read than direct links

### Why No Inline HTML?

- XSS is the #1 markdown security issue
- HTML parsing adds massive complexity
- Breaks "readable raw text" principle
- Shortcodes provide safe alternatives

---

## 9. Compliance Levels

| Level | Features | Use Case |
|-------|----------|----------|
| **Core** | All sections 4.1-4.7 | Comments, basic docs |
| **Standard** | Core + Tables + Footnotes | Technical documentation |
| **Full** | Standard + Math + Diagrams + All Extensions | Scientific publishing |

---

## 10. Migration from Markdown

### Automated Migration

```bash
# Convert Markdown → MarkNext
marknext migrate input.md output.mnext

# Migrations performed:
# - `**bold**` → `*bold*`
# - `_italic_` → `/italic/`
# - Setext headers → ATX
# - Reference links → Direct links
# - Inline HTML → Shortcodes or warnings
```

### Compatibility Mode

```toml
[compatibility]
mode = "strict"  # "strict" | "warn" | "legacy"
# strict: Reject non-compliant syntax
# warn: Allow but warn
# legacy: Full CommonMark support (not recommended)
```

---

## 11. Implementation Requirements

### Parser Requirements

1. **CFG Only**: Parser must use context-free grammar
2. **No Regex**: Don't parse with regex (causes ReDoS)
3. **Streaming**: Support streaming input for large docs
4. **Error Recovery**: Continue parsing after errors with clear locations
5. **Source Maps**: Track source positions for error reporting

### Security Requirements

1. **HTML Sanitization**: Not needed (HTML banned)
2. **Shortcode Sandboxing**: Shortcodes cannot execute code
3. **Extension Isolation**: Extensions run in separate process

---

## 12. Future Considerations

### Versioning

- **v1.x**: Core specification locked
- **v2.x**: Extensions only, backward compatible
- Breaking changes require major version

### Extension Registry

Official extensions maintained separately:
- `marknext-ext-tables`
- `marknext-ext-math`
- `marknext-ext-footnotes`
- `marknext-ext-diagrams`

---

## Appendix A: Complete Example Document

```markdown
# MarkNext: A Better Markdown

MarkNext fixes the /ambiguities/ and *security issues* in Markdown.

## Features

- One way to do each thing
- Context-free grammar
- No inline HTML

## Code Example

```rust
fn main() {
    println!("Hello, MarkNext!");
}
```

## Quote

> The goal of a designer is to listen, observe, understand,
> sympathize, empathize, synthesize, and glean insights that enable
> him or her to 'make the invisible visible.'
> — Hillman Curtis

## Table

| Feature | Markdown | MarkNext |
|--------:|:--------:|:--------:|
| Bold | `**` or `__` | `*` |
| Italic | `*` or `_` | `/` |
| Headers | ATX or Setext | ATX only |

## Link

Learn more at [skorotkiewicz/marknext](https://github.com/skorotkiewicz/marknext)

See the image: ![MarkNext Logo](logo.png)

---

## Extensions

This uses the math extension: $E = mc^2$

And footnotes[^1].

[^1]: This is the footnote text.

[info text="This is a shortcode for an info box"]
```

---

## License

This specification is released under the Creative Commons Attribution 4.0 International License (CC BY 4.0).
