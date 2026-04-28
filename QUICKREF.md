# MarkNext Quick Reference

## One Syntax Per Feature

| Result | Syntax | Example |
|--------|--------|---------|
| **Bold** | `*text*` | `*bold*` |
| *Italic* | `/text/` | `/italic/` |
| ***Bold Italic*** | `*/text/*` | `*/bold italic/*` |
| `Inline Code` | `` `text` `` | `` `code` `` |

## Headers

```markdown
# H1
## H2
### H3
#### H4
##### H5
###### H6
```

## Lists

```markdown
- Item one
- Item two
  - Nested (2+ spaces indent)
  - Another nested
- Item three

1. First
2. Second
3. Third
```

## Code Block

````markdown
```javascript
function example() {
  return "Hello";
}
```
````

## Links & Images

```markdown
[Link text](https://example.com)
![Alt text](image.png)
```

## Quotes

```markdown
> This is a quote
> Multiple lines
>> Nested quote
```

## Table

```markdown
| Header | Header |
|--------|--------|
| Cell   | Cell   |
| Cell   | Cell   |
```

## Escapes

```markdown
\*not bold\*
\/not italic\/
\`not code\`
\[not a link\]
```

## Line Break

```markdown
Line one\
Line two (forced break)
```

## Horizontal Rule

```markdown
---
```

## Shortcodes (Safe Extensions)

```markdown
[warning text="Don't do this"]
[alert type="info" text="Note this"]
[math latex="E=mc^2"]
```

---

## What MarkNext Removed

| Markdown | MarkNext | Why |
|----------|----------|-----|
| `**bold**` | `*bold*` | Single syntax |
| `_italic_` | `/italic/` | No identifier conflict |
| Underline `__` | ❌ Removed | Not semantic |
| Setext headers | `# only` | One way |
| `*` lists | `- only` | No bold conflict |
| `+` lists | `- only` | Unnecessary |
| Reference links | Direct only | Context-free grammar |
| Inline HTML | ❌ Banned | XSS prevention |
| 4-space code | Fenced only | Clearer syntax |

---

## Security Rules

1. **No HTML** - Use shortcodes instead
2. **Compile-time only** - No runtime rendering
3. **Context-free** - No document-wide references

---

**MarkNext v1.0** | [Full Specification](MARKNEXT_SPEC.md)
