# MarkNext

**A minimal, unambiguous, and secure Markdown successor.**

MarkNext fixes the fundamental problems with Markdown while keeping what makes it great: minimal friction, readable raw text, and simple syntax.

## The Problem with Markdown

- **Ambiguity**: Multiple syntaxes for the same output (`**` vs `__`, `#` vs `===`)
- **Security**: Inline HTML allows XSS attacks
- **Complexity**: Context-sensitive grammar (footnotes, reference links)
- **No build system**: Runtime rendering causes security and performance issues

## MarkNext Solutions

| Problem | MarkNext Fix |
|---------|-------------|
| Multiple bold syntaxes | `*text*` only |
| Multiple italic syntaxes | `/text/` only |
| Context-sensitive features | Strict CFG grammar |
| Inline HTML XSS | **Banned entirely** |
| No build pipeline | First-class compilation |

## Key Documents

- **[MARKNEXT_SPEC.md](MARKNEXT_SPEC.md)** - Complete formal specification
- **[grammar.ebnf](grammar.ebnf)** - Formal EBNF grammar
- **[QUICKREF.md](QUICKREF.md)** - Quick reference guide
- **[example.mnext](example.mnext)** - Example document

## Syntax Highlights

```markdown
# Headers (ATX style only)

*Bold text*          # Single asterisk
/Italic text/        # Slashes, not underscores
*/Bold italic/*      # Combined

- List item one      # Dash only
- List item two

[Link](url)          # Direct only, no reference style

```code```            # Fenced code blocks only

[warning text="Safe shortcodes replace HTML"]
```

## Principles

1. **One Way To Do Things** - No duplicate syntaxes
2. **Context-Free Grammar** - Strict CFG, no ambiguities
3. **Safe by Default** - No inline HTML, sandboxed extensions
4. **Readable Raw Text** - Source should be as legible as rendered
5. **Compiled, Not Rendered** - Build-time processing for safety

## License

Specification: CC BY 4.0
