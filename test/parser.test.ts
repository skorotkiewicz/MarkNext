import { describe, test, expect } from "bun:test";
import { tokenize } from "../src/lexer";
import { parse } from "../src/parser";
import { compile, compileSync } from "../src/index";
import { TokenType } from "../src/tokens";

describe("MarkNext Parser", () => {

  describe("Lexer", () => {
    test("tokenizes headers", () => {
      const tokens = tokenize("# Header");
      expect(tokens[0]!.type).toBe(TokenType.HASH);
      expect(tokens[0]!.value).toBe("#");
      expect(tokens[1]!.type).toBe(TokenType.SPACE);
      expect(tokens[2]!.type).toBe(TokenType.TEXT);
    });

    test("tokenizes emphasis", () => {
      const tokens = tokenize("*bold*");
      expect(tokens[0]!.type).toBe(TokenType.STAR);
      expect(tokens[1]!.type).toBe(TokenType.TEXT);
      expect(tokens[2]!.type).toBe(TokenType.STAR);
    });

    test("tokenizes code fences", () => {
      const tokens = tokenize("```\ncode\n```");
      expect(tokens[0]!.type).toBe(TokenType.CODE_FENCE);
    });

    test("tokenizes thematic break", () => {
      const tokens = tokenize("---");
      expect(tokens[0]!.type).toBe(TokenType.THEMATIC_BREAK);
    });

    test("emits GT_SYMBOL for angle-bracket URLs", () => {
      const tokens = tokenize("[text](<url>)");
      const gtSymbolIdx = tokens.findIndex(t => t.type === TokenType.GT_SYMBOL);
      expect(gtSymbolIdx).toBeGreaterThan(-1);
      const gtIdx = tokens.findIndex(t => t.type === TokenType.GT);
      expect(gtIdx).toBe(-1);
    });

    test("emits GT for blockquote, GT_SYMBOL for angle URL", () => {
      const tokens = tokenize("> quote\n[text](<url>)");
      const gtCount = tokens.filter(t => t.type === TokenType.GT).length;
      const gtSymbolCount = tokens.filter(t => t.type === TokenType.GT_SYMBOL).length;
      expect(gtCount).toBe(1);
      expect(gtSymbolCount).toBe(1);
    });
  });

  describe("Parser", () => {
    test("parses header level 1", () => {
      const ast = parse(tokenize("# Title"));
      expect(ast.children[0]!.type).toBe("Header");
      expect((ast.children[0]! as any).level).toBe(1);
    });

    test("parses header level 2", () => {
      const ast = parse(tokenize("## Subtitle"));
      expect(ast.children[0]!.type).toBe("Header");
      expect((ast.children[0]! as any).level).toBe(2);
    });

    test("parses bold text", () => {
      const ast = parse(tokenize("*bold text*"));
      expect(ast.children[0]!.type).toBe("Paragraph");
      expect((ast.children[0]! as any).children[0]!.type).toBe("Bold");
    });

    test("parses italic text", () => {
      const ast = parse(tokenize("/italic text/"));
      expect(ast.children[0]!.type).toBe("Paragraph");
      expect((ast.children[0]! as any).children[0]!.type).toBe("Italic");
    });

    test("parses combined emphasis", () => {
      const ast = parse(tokenize("*/bold italic/*"));
      const bold = (ast.children[0]! as any).children[0];
      expect(bold.type).toBe("Bold");
      expect(bold.children[0]!.type).toBe("Italic");
    });

    test("parses inline code", () => {
      const ast = parse(tokenize("`code`"));
      expect((ast.children[0]! as any).children[0]!.type).toBe("Code");
    });

    test("parses code block", () => {
      const ast = parse(tokenize("```js\ncode\n```"));
      expect(ast.children[0]!.type).toBe("CodeBlock");
      expect((ast.children[0]! as any).language).toBe("js");
    });

    test("parses unordered list", () => {
      const ast = parse(tokenize("- item 1\n- item 2"));
      expect(ast.children[0]!.type).toBe("List");
      expect((ast.children[0]! as any).ordered).toBe(false);
      expect((ast.children[0]! as any).children.length).toBe(2);
    });

    test("parses ordered list", () => {
      const ast = parse(tokenize("1. item 1\n2. item 2"));
      expect(ast.children[0]!.type).toBe("List");
      expect((ast.children[0]! as any).ordered).toBe(true);
    });

    test("parses blockquote", () => {
      const ast = parse(tokenize("> quote"));
      expect(ast.children[0]!.type).toBe("Blockquote");
    });

    test("parses nested blockquote", () => {
      const ast = parse(tokenize(">> nested quote"));
      const outer = ast.children[0]!;
      expect(outer.type).toBe("Blockquote");
      const inner = (outer as any).children[0]!;
      expect(inner.type).toBe("Blockquote");
    });

    test("parses thematic break", () => {
      const ast = parse(tokenize("---"));
      expect(ast.children[0]!.type).toBe("ThematicBreak");
    });

    test("parses link", () => {
      const ast = parse(tokenize("[text](url)"));
      const link = (ast.children[0]! as any).children[0];
      expect(link.type).toBe("Link");
      expect(link.url).toBe("url");
    });

    test("parses image", () => {
      const ast = parse(tokenize("![alt](img.png)"));
      const img = (ast.children[0]! as any).children[0];
      expect(img.type).toBe("Image");
      expect(img.url).toBe("img.png");
      expect(img.alt).toBe("alt");
    });
  });

  describe("HTML Renderer", () => {
    test("renders headers", () => {
      const html = compileSync("# Title");
      expect(html).toContain("<h1>");
      expect(html).toContain("</h1>");
      expect(html).toContain("Title");
    });

    test("renders bold", () => {
      const html = compileSync("*bold*");
      expect(html).toContain("<strong>");
      expect(html).toContain("bold");
      expect(html).toContain("</strong>");
    });

    test("renders italic", () => {
      const html = compileSync("/italic/");
      expect(html).toContain("<em>");
      expect(html).toContain("italic");
      expect(html).toContain("</em>");
    });

    test("renders code", () => {
      const html = compileSync("`code`");
      expect(html).toContain("<code>");
      expect(html).toContain("code");
    });

    test("renders code block", () => {
      const html = compileSync("```js\ncode\n```");
      expect(html).toContain("<pre>");
      expect(html).toContain("<code");
      expect(html).toContain("class=\"language-js\"");
    });

    test("renders unordered list", () => {
      const html = compileSync("- a\n- b");
      expect(html).toContain("<ul>");
      expect(html).toContain("<li>");
      expect(html).toContain("</ul>");
    });

    test("renders ordered list", () => {
      const html = compileSync("1. a\n2. b");
      expect(html).toContain("<ol>");
      expect(html).toContain('<li value="1">');
      expect(html).toContain('<li value="2">');
    });

    test("renders blockquote", () => {
      const html = compileSync("> quote");
      expect(html).toContain("<blockquote>");
      expect(html).toContain("quote");
    });

    test("renders thematic break", () => {
      const html = compileSync("---");
      expect(html).toContain("<hr />");
    });

    test("renders link", () => {
      const html = compileSync("[text](https://example.com)");
      expect(html).toContain("<a");
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain("text");
    });

    test("renders image", () => {
      const html = compileSync("![alt](img.png)");
      expect(html).toContain("<img");
      expect(html).toContain('src="img.png"');
      expect(html).toContain('alt="alt"');
    });

    test("escapes HTML in text", () => {
      const html = compileSync("<script>");
      expect(html).toContain("&lt;script&gt;");
      expect(html).not.toContain("<script>");
    });

    test("handles line breaks", () => {
      const html = compileSync("line1\\\nline2");
      expect(html).toContain("<br />");
    });
  });

  describe("Integration", () => {
    test("compiles full document", () => {
      const source = `
# MarkNext

*Bold* and /italic/ text.

## Features

- Feature 1
- Feature 2

> A quote

[Link](url)
`;
      const html = compileSync(source);

      expect(html).toContain("<h1>MarkNext</h1>");
      expect(html).toContain("<strong>Bold</strong>");
      expect(html).toContain("<em>italic</em>");
      expect(html).toContain("<h2>Features</h2>");
      expect(html).toContain("<ul>");
      expect(html).toContain("<blockquote>");
      expect(html).toContain('href="url"');
    });

    test("compile() returns errors array", () => {
      const result = compile("# Test");
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test("compile() returns AST when sourceMap enabled", () => {
      const result = compile("# Test", { sourceMap: true });
      expect(result.ast).toBeDefined();
      expect(result.ast?.type).toBe("Document");
    });
  });

  describe("MarkNext Differences from Markdown", () => {
    test("uses * for bold, not **", () => {
      // In MarkNext: *bold* is correct
      const ast = parse(tokenize("*bold*"));
      expect((ast.children[0]! as any).children[0]!.type).toBe("Bold");
    });

    test("uses / for italic, not _", () => {
      // In MarkNext: /italic/ is correct
      const ast = parse(tokenize("/italic/"));
      expect((ast.children[0]! as any).children[0]!.type).toBe("Italic");
    });

    test("uses - for lists, not *", () => {
      // In MarkNext: - item is correct
      const ast = parse(tokenize("- item"));
      expect(ast.children[0]!.type).toBe("List");
    });

    test("underscores are just text", () => {
      // In MarkNext: _text_ is NOT italic, it's just text
      const ast = parse(tokenize("_text_"));
      expect((ast.children[0]! as any).children[0]!.type).toBe("Text");
    });

    test("/*text*/ produces italic containing bold", () => {
      const ast = parse(tokenize("/*bold italic*/"));
      const para = ast.children[0]! as any;
      expect(para.children[0]!.type).toBe("Italic");
      expect(para.children[0]!.children[0]!.type).toBe("Bold");
    });

    test("*/text/* produces bold containing italic", () => {
      const ast = parse(tokenize("*/bold italic/*"));
      const para = ast.children[0]! as any;
      expect(para.children[0]!.type).toBe("Bold");
      expect(para.children[0]!.children[0]!.type).toBe("Italic");
    });
  });

  describe("Extensions", () => {
    describe("Footnotes", () => {
      test("parses footnote reference", () => {
        const ast = parse(tokenize("Text[^1] more"));
        const para = ast.children[0]! as any;
        expect(para.children[1]!.type).toBe("Footnote");
        expect(para.children[1]!.id).toBe("1");
      });

      test("parses footnote definition", () => {
        const ast = parse(tokenize("[^1]: This is a footnote"));
        expect(ast.children[0]!.type).toBe("FootnoteDefinition");
        expect((ast.children[0]! as any).id).toBe("1");
      });

      test("renders footnote reference", () => {
        const html = compileSync("Text[^1]");
        expect(html).toContain('class="footnote-ref"');
        expect(html).toContain('href="#fn-1"');
      });

      test("renders footnote definition", () => {
        const source = `Text[^1]

[^1]: This is a footnote`;
        const html = compileSync(source);
        expect(html).toContain('class="footnotes"');
        expect(html).toContain('id="fn-1"');
      });

      test("renders footnote backlink with HTML entity", () => {
        const source = `Text[^1]

[^1]: This is a footnote`;
        const html = compileSync(source);
        expect(html).toContain('&#8592;'); // HTML entity for back arrow
        expect(html).toContain('href="#fnref-1"');
      });
    });

    describe("Math", () => {
      test("parses inline math", () => {
        const ast = parse(tokenize("$E=mc^2$"));
        const para = ast.children[0]! as any;
        expect(para.children[0]!.type).toBe("Math");
        expect(para.children[0]!.display).toBe(false);
        expect(para.children[0]!.content).toBe("E=mc^2");
      });

      test("parses display math as block when at line start", () => {
        const ast = parse(tokenize("$$E=mc^2$$"));
        // When $$ is at the start of a line, it's parsed as MathBlock
        expect(ast.children[0]!.type).toBe("MathBlock");
        expect((ast.children[0]! as any).content).toBe("E=mc^2");
      });

      test("parses math block", () => {
        const ast = parse(tokenize("$$\nE=mc^2\n$$"));
        expect(ast.children[0]!.type).toBe("MathBlock");
        expect((ast.children[0]! as any).content).toBe("E=mc^2");
      });

      test("renders inline math", () => {
        const html = compileSync("$x^2$");
        expect(html).toContain('class="math inline"');
        expect(html).toContain('data-latex="x^2"');
      });

      test("renders math block", () => {
        const html = compileSync("$$\nx^2\n$$");
        expect(html).toContain('class="math block"');
      });
    });

    describe("Enhanced Tables", () => {
      test("renders table with alignment", () => {
        const source = `| Left | Center | Right |
|:-----|:------:|------:|
| A    | B      | C     |`;
        const html = compileSync(source);
        expect(html).toContain("<table>");
        expect(html).toContain('text-align: left');
        expect(html).toContain('text-align: center');
        expect(html).toContain('text-align: right');
        expect(html).toContain("<th ");
        expect(html).toContain("<td ");
      });

      test("parses table alignments in AST", () => {
        const source = `| Left | Center | Right |
|:-----|:------:|------:|
| A    | B      | C     |`;
        const result = compile(source, { sourceMap: true });
        const table = result.ast?.children[0] as any;
        expect(table.type).toBe("Table");
        expect(table.alignments).toEqual(["left", "center", "right"]);
      });

      test("renders table with default (null) alignment", () => {
        const source = `| A | B |
|---|---|
| 1 | 2 |`;
        const html = compileSync(source);
        expect(html).toContain("<table>");
        expect(html).toContain("<th>");
        expect(html).toContain("<td>");
        expect(html).not.toContain("text-align");
      });
    });

    describe("Shortcodes", () => {
      test("parses shortcode with text param", () => {
        const ast = parse(tokenize('[warning text="This is a warning"]'));
        const para = ast.children[0]! as any;
        expect(para.children[0]!.type).toBe("Shortcode");
        expect(para.children[0]!.name).toBe("warning");
        expect(para.children[0]!.params.text).toBe("This is a warning");
      });

      test("parses shortcode with multiple params", () => {
        const ast = parse(tokenize('[alert type="tip" text="Use MarkNext"]'));
        const para = ast.children[0]! as any;
        const sc = para.children[0]!;
        expect(sc.type).toBe("Shortcode");
        expect(sc.name).toBe("alert");
        expect(sc.params.type).toBe("tip");
        expect(sc.params.text).toBe("Use MarkNext");
      });

      test("parses shortcode without params", () => {
        const ast = parse(tokenize('[note]'));
        const para = ast.children[0]! as any;
        expect(para.children[0]!.type).toBe("Shortcode");
        expect(para.children[0]!.name).toBe("note");
      });

      test("renders shortcode with text param", () => {
        const html = compileSync('[warning text="Danger!"]');
        expect(html).toContain('class="shortcode shortcode-warning"');
        expect(html).toContain('Danger!');
      });

      test("renders shortcode with extra params as data attributes", () => {
        const html = compileSync('[alert type="tip" text="Note this"]');
        expect(html).toContain('data-type="tip"');
        expect(html).toContain('Note this');
      });

      test("does not confuse shortcodes with links", () => {
        const ast = parse(tokenize('[text](url)'));
        const para = ast.children[0]! as any;
        expect(para.children[0]!.type).toBe("Link");
      });
    });

    describe("Auto-links", () => {
      test("parses standalone auto-link", () => {
        const ast = parse(tokenize('<https://example.com>'));
        const para = ast.children[0]! as any;
        expect(para.children[0]!.type).toBe("Link");
        expect(para.children[0]!.url).toBe("https://example.com");
        expect(para.children[0]!.children[0]!.value).toBe("https://example.com");
      });

      test("renders standalone auto-link", () => {
        const html = compileSync('<https://example.com>');
        expect(html).toContain('href="https://example.com"');
        expect(html).toContain('https://example.com');
      });

      test("does not parse non-URL angle brackets as auto-link", () => {
        const html = compileSync('<script>');
        expect(html).toContain('&lt;script&gt;');
        expect(html).not.toContain('<a');
      });

      test("auto-link with http scheme", () => {
        const ast = parse(tokenize('<http://example.com>'));
        const para = ast.children[0]! as any;
        expect(para.children[0]!.type).toBe("Link");
        expect(para.children[0]!.url).toBe("http://example.com");
      });

      test("auto-link with mailto scheme", () => {
        const ast = parse(tokenize('<mailto:test@example.com>'));
        const para = ast.children[0]! as any;
        expect(para.children[0]!.type).toBe("Link");
        expect(para.children[0]!.url).toBe("mailto:test@example.com");
      });
    });

    describe("Code Block Language IDs", () => {
      test("parses language with dash", () => {
        const ast = parse(tokenize('```objective-c\ncode\n```'));
        expect(ast.children[0]!.type).toBe("CodeBlock");
        expect((ast.children[0]! as any).language).toBe("objective-c");
      });

      test("parses language with underscore", () => {
        const ast = parse(tokenize('```f_sharp\ncode\n```'));
        expect(ast.children[0]!.type).toBe("CodeBlock");
        expect((ast.children[0]! as any).language).toBe("f_sharp");
      });

      test("renders language with dash", () => {
        const html = compileSync('```objective-c\ncode\n```');
        expect(html).toContain('class="language-objective-c"');
      });
    });

    describe("Sublists", () => {
      test("parses nested unordered list", () => {
        const source = "- item 1\n  - nested 1\n  - nested 2\n- item 2";
        const ast = parse(tokenize(source));
        const list = ast.children[0]! as any;
        expect(list.type).toBe("List");
        expect(list.children[0]!.children[0]!.type).toBe("Text");
        const nestedList = list.children[0]!.children.find((c: any) => c.type === "List");
        expect(nestedList).toBeDefined();
        expect(nestedList.ordered).toBe(false);
        expect(nestedList.children.length).toBe(2);
      });
    });

    describe("Escape Validation", () => {
      test("escapes valid characters", () => {
        const ast = parse(tokenize('\\*'));
        const para = ast.children[0]! as any;
        expect(para.children[0]!.type).toBe("Escape");
        expect(para.children[0]!.char).toBe("*");
      });

      test("non-escapable character becomes literal text", () => {
        const ast = parse(tokenize('\\a'));
        const para = ast.children[0]! as any;
        expect(para.children[0]!.type).toBe("Text");
        expect(para.children[0]!.value).toBe("\\a");
      });

      test("escapes backslash itself", () => {
        const ast = parse(tokenize('\\\\'));
        const para = ast.children[0]! as any;
        expect(para.children[0]!.type).toBe("Escape");
        expect(para.children[0]!.char).toBe("\\");
      });

      test("escapes hash", () => {
        const html = compileSync('\\#');
        expect(html).toContain('#');
        expect(html).not.toContain('<h');
      });

      test("renders non-escapable as literal", () => {
        const html = compileSync('\\x');
        expect(html).toContain('\\x');
      });
    });
  });
});
