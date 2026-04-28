; MarkNext syntax highlighting for Zed
; Based on Tree-sitter grammar patterns

;; Headers
(atx_heading) @markup.heading
(atx_h1_marker) @markup.heading.marker
(atx_h2_marker) @markup.heading.marker
(atx_h3_marker) @markup.heading.marker
(atx_h4_marker) @markup.heading.marker
(atx_h5_marker) @markup.heading.marker
(atx_h6_marker) @markup.heading.marker
(setext_heading) @markup.heading
(setext_h1_underline) @markup.heading.marker
(setext_h2_underline) @markup.heading.marker

;; Bold - *text*
(strong) @markup.strong

;; Italic - /text/
(emphasis) @markup.italic

;; Code inline - `code`
(code_span) @markup.raw.inline

;; Code block - ```
(fenced_code_block) @markup.raw.block
(info_string) @tag.attribute
(code_fence_content) @markup.raw.block

;; Links - [text](url)
(link) @markup.link
(link_text) @markup.link.label
(link_destination) @markup.link.url

;; Images - ![alt](url)
(image) @markup.link.image
(image_description) @markup.link.label
(image_destination) @markup.link.url

;; Blockquotes - >
(block_quote) @markup.quote

;; Lists
(list) @markup.list
(list_item) @markup.list.item
(bullet_list_marker) @markup.list.unnumbered
(ordered_list_marker) @markup.list.numbered
(task_list_marker) @markup.list.check
(task_list_marker_checked) @markup.list.check

;; Tables
(table) @markup.table
(table_row) @markup.table.row
(table_cell) @markup.table.cell
(table_header) @markup.table.header
(table_delimiter) @markup.table.delimiter

;; Horizontal rule
(thematic_break) @markup.rule

;; Footnotes
(footnote) @markup.footnote
(footnote_reference) @markup.footnote.reference
(footnote_definition) @markup.footnote.definition

;; Math
(math) @markup.math
(inline_math) @markup.math
(display_math) @markup.math

;; Shortcodes - [tag attr="value"]
(shortcode) @tag
(shortcode_name) @tag.name
(shortcode_attribute) @tag.attribute
(shortcode_value) @string

;; Escape sequences
(escape_sequence) @string.escape

;; Auto-links - <https://...>
(auto_link) @markup.link.url

;; Line breaks - \
(line_break) @punctuation.special

;; Punctuation
"[" @punctuation.bracket
"]" @punctuation.bracket
"(" @punctuation.bracket
")" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket
"`" @punctuation.special
"```" @punctuation.special
"*" @punctuation.special
"/" @punctuation.special
"|" @punctuation.delimiter
"-" @punctuation.list_marker
">" @punctuation.special
"^" @punctuation.special
"$" @punctuation.special
"!" @punctuation.special
"#" @punctuation.special

;; Comments
(comment) @comment
