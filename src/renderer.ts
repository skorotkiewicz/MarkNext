import type {
  Node, Document, Block, Header, Paragraph, List, ListItem,
  CodeBlock, Blockquote, ThematicBreak, Table, TableRow, TableCell,
  Inline, Text, Bold, Italic, Code, Link, Image, LineBreak, Escape,
  Footnote, FootnoteDefinition, Math, MathBlock, Shortcode
} from './ast';

export interface RenderOptions {
  pretty?: boolean;
  safe?: boolean;  // Always true for MarkNext
}

export class HTMLRenderer {
  private options: RenderOptions;
  private indent: number = 0;

  constructor(options: RenderOptions = {}) {
    this.options = {
      pretty: false,
      safe: true,
      ...options
    };
  }

  render(node: Node): string {
    switch (node.type) {
      case 'Document':
        return this.renderDocument(node as Document);
      case 'Header':
        return this.renderHeader(node as Header);
      case 'Paragraph':
        return this.renderParagraph(node as Paragraph);
      case 'List':
        return this.renderList(node as List);
      case 'ListItem':
        return this.renderListItem(node as ListItem);
      case 'CodeBlock':
        return this.renderCodeBlock(node as CodeBlock);
      case 'Blockquote':
        return this.renderBlockquote(node as Blockquote);
      case 'ThematicBreak':
        return this.renderThematicBreak();
      case 'Table':
        return this.renderTable(node as Table);
      case 'TableRow':
        return this.renderTableRow(node as TableRow);
      case 'TableCell':
        return this.renderTableCell(node as TableCell);
      case 'Footnote':
        return this.renderFootnote(node as Footnote);
      case 'FootnoteDefinition':
        return this.renderFootnoteDefinition(node as FootnoteDefinition);
      case 'Math':
        return this.renderMath(node as Math);
      case 'MathBlock':
        return this.renderMathBlock(node as MathBlock);
      case 'Text':
        return this.renderText(node as Text);
      case 'Bold':
        return this.renderBold(node as Bold);
      case 'Italic':
        return this.renderItalic(node as Italic);
      case 'Code':
        return this.renderCode(node as Code);
      case 'Link':
        return this.renderLink(node as Link);
      case 'Image':
        return this.renderImage(node as Image);
      case 'LineBreak':
        return this.renderLineBreak();
      case 'Escape':
        return this.renderEscape(node as Escape);
      case 'Shortcode':
        return this.renderShortcode(node as Shortcode);
      default:
        return '';
    }
  }

  private renderDocument(doc: Document): string {
    // Separate footnote definitions from other blocks
    const blocks: Block[] = [];
    const footnotes: FootnoteDefinition[] = [];

    for (const child of doc.children) {
      if (child.type === 'FootnoteDefinition') {
        footnotes.push(child as FootnoteDefinition);
      } else {
        blocks.push(child);
      }
    }

    let html = blocks.map(child => this.render(child)).join('');

    // Render footnotes section if there are any
    if (footnotes.length > 0) {
      const footnotesHtml = footnotes.map(fn => this.renderFootnoteDefinition(fn)).join('');
      html += this.wrap('section', footnotesHtml, ' class="footnotes"');
    }

    return this.options.pretty ? this.prettyPrint(html) : html;
  }

  private renderHeader(header: Header): string {
    const tag = `h${header.level}`;
    const content = header.children.map(child => this.renderInline(child)).join('');
    return this.wrap(tag, content);
  }

  private renderParagraph(para: Paragraph): string {
    const content = para.children.map(child => this.renderInline(child)).join('');
    if (content.trim() === '') return '';
    return this.wrap('p', content);
  }

  private renderList(list: List): string {
    const tag = list.ordered ? 'ol' : 'ul';
    const items = list.children.map(child => this.render(child)).join('');
    // Preserve starting number for ordered lists
    const firstNum = list.ordered ? list.children[0]?.number : undefined;
    const startAttr = firstNum && firstNum !== '1' ? ` start="${firstNum}"` : '';
    return this.wrap(tag, items, startAttr);
  }

  private renderListItem(item: ListItem): string {
    const valueAttr = item.number ? ` value="${item.number}"` : '';
    const content = item.children.map(child => {
      if (child.type === 'Header' || child.type === 'Paragraph' || child.type === 'List' ||
          child.type === 'CodeBlock' || child.type === 'Blockquote' || child.type === 'Table') {
        return this.render(child);
      } else {
        return this.renderInline(child as Inline);
      }
    }).join('');
    return this.wrap('li', content, valueAttr);
  }

  private renderCodeBlock(block: CodeBlock): string {
    const attrs = block.language ? ` class="language-${this.escapeHtml(block.language)}"` : '';
    const code = this.wrap('code', this.escapeHtml(block.content), attrs);
    return this.wrap('pre', code);
  }

  private renderBlockquote(bq: Blockquote): string {
    const content = bq.children.map(child => this.render(child)).join('');
    return this.wrap('blockquote', content);
  }

  private renderThematicBreak(): string {
    return '<hr />';
  }

  private renderTable(table: Table): string {
    const alignments = table.alignments;
    const header = this.renderTableHeader(table.header, alignments);
    const body = table.rows.map((row, rowIdx) => this.renderTableRow(row, alignments, rowIdx)).join('');
    return this.wrap('table', header + this.wrap('tbody', body));
  }

  private renderTableHeader(row: TableRow, alignments?: ('left' | 'center' | 'right' | null)[]): string {
    const cells = row.cells.map((cell, idx) => {
      const content = cell.children.map(child => this.renderInline(child)).join('');
      const align = alignments?.[idx];
      const attrs = align ? ` style="text-align: ${align}"` : '';
      return this.wrap('th', content, attrs);
    }).join('');
    return this.wrap('thead', this.wrap('tr', cells));
  }

  private renderTableRow(row: TableRow, alignments?: ('left' | 'center' | 'right' | null)[], _rowIdx?: number): string {
    const cells = row.cells.map((cell, idx) => this.renderTableCell(cell, alignments?.[idx])).join('');
    return this.wrap('tr', cells);
  }

  private renderTableCell(cell: TableCell, align?: 'left' | 'center' | 'right' | null): string {
    const content = cell.children.map(child => this.renderInline(child)).join('');
    const attrs = align ? ` style="text-align: ${align}"` : '';
    return this.wrap('td', content, attrs);
  }

  private renderFootnote(footnote: Footnote): string {
    const id = this.escapeHtml(footnote.id);
    return `<sup class="footnote-ref"><a href="#fn-${id}" id="fnref-${id}">${id}</a></sup>`;
  }

  private renderFootnoteDefinition(defn: FootnoteDefinition): string {
    const id = this.escapeHtml(defn.id);
    const content = defn.children.map(child => this.render(child)).join('');
    // Use HTML entity for back arrow to ensure proper encoding
    return `<div class="footnote" id="fn-${id}"><sup>${id}</sup> ${content} <a href="#fnref-${id}">&#8592;</a></div>`;
  }

  private renderMath(math: Math): string {
    // Use MathML or KaTeX-compatible format
    // For now, use semantic HTML with data attribute
    const escaped = this.escapeHtml(math.content);
    if (math.display) {
      return `<span class="math display" data-latex="${escaped}">${escaped}</span>`;
    }
    return `<span class="math inline" data-latex="${escaped}">${escaped}</span>`;
  }

  private renderMathBlock(math: MathBlock): string {
    const escaped = this.escapeHtml(math.content);
    return `<div class="math block" data-latex="${escaped}">${escaped}</div>`;
  }

  private renderInline(inline: Inline): string {
    return this.render(inline as unknown as Node);
  }

  private renderText(text: Text): string {
    return this.escapeHtml(text.value);
  }

  private renderBold(bold: Bold): string {
    const content = bold.children.map(child => this.renderInline(child)).join('');
    return this.wrap('strong', content);
  }

  private renderItalic(italic: Italic): string {
    const content = italic.children.map(child => this.renderInline(child)).join('');
    return this.wrap('em', content);
  }

  private renderCode(code: Code): string {
    return this.wrap('code', this.escapeHtml(code.value));
  }

  private renderLink(link: Link): string {
    const content = link.children.map(child => this.renderInline(child)).join('');
    const attrs = [`href="${this.escapeHtml(link.url)}"`];
    if (link.title) {
      attrs.push(`title="${this.escapeHtml(link.title)}"`);
    }
    return this.wrap('a', content, ' ' + attrs.join(' '));
  }

  private renderImage(image: Image): string {
    const attrs = [
      `src="${this.escapeHtml(image.url)}"`,
      `alt="${this.escapeHtml(image.alt)}"`
    ];
    if (image.title) {
      attrs.push(`title="${this.escapeHtml(image.title)}"`);
    }
    return `<img ${attrs.join(' ')} />`;
  }

  private renderLineBreak(): string {
    return '<br />';
  }

  private renderEscape(escape: Escape): string {
    return this.escapeHtml(escape.char);
  }

  private renderShortcode(shortcode: Shortcode): string {
    const name = this.escapeHtml(shortcode.name);
    const dataAttrs = Object.entries(shortcode.params)
      .filter(([k]) => k !== 'text')
      .map(([k, v]) => `data-${this.escapeHtml(k)}="${this.escapeHtml(v)}"`)
      .join(' ');
    const textContent = shortcode.params['text'] || '';
    const attrs = dataAttrs ? ' ' + dataAttrs : '';
    return `<span class="shortcode shortcode-${name}"${attrs}>${this.escapeHtml(textContent)}</span>`;
  }

  // Utility methods
  private wrap(tag: string, content: string, attrs: string = ''): string {
    if (content === '' && tag !== 'td' && tag !== 'th') return '';
    return `<${tag}${attrs}>${content}</${tag}>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private prettyPrint(html: string): string {
    // Simple pretty printing
    const separator = '><';
    const parts = html.split(separator);
    let result = '';
    let depth = 0;

    for (let i = 0; i < parts.length; i++) {
      let line = parts[i]!;
      if (i > 0) line = '<' + line;
      if (i < parts.length - 1) line = line + '>';

      if (line.match(/^<\/\w/)) depth--;
      if (depth < 0) depth = 0;

      if (line.trim()) {
        result += '  '.repeat(depth) + line + '\n';
      }

      if (line.match(/^<\w[^>]*>[^<]*$/) && !line.match(/\/$/)) depth++;
    }

    return result;
  }
}

export function renderToHTML(node: Node, options?: RenderOptions): string {
  const renderer = new HTMLRenderer(options);
  return renderer.render(node);
}
