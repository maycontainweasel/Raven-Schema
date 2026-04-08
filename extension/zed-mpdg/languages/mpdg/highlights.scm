(comment) @comment
(string) @string
(number) @number
(boolean) @boolean
(field_reference) @variable.special
(arrow) @operator
(separator) @punctuation.delimiter

(stanza_header
  label: (label_identifier) @type
  model: (identifier) @variable.special
  description: (description) @string)

(subtable_header
  label: (label_identifier) @type
  model: (identifier) @variable.special
  description: (description) @string)

(field
  name: (field_name) @property)

(field
  modifier: [
    "!"
    "?"
  ] @operator)

(capability_entry
  name: (identifier) @keyword)

(property
  key: (identifier) @property)

(edge
  name: (edge_identifier) @function
  target: (edge_identifier) @type)

(program_tag
  [
    "<"
    ">"
  ] @punctuation.bracket)

[
  "{"
  "}"
  "["
  "]"
  "("
  ")"
] @punctuation.bracket

[
  "::"
  "="
  "*"
  "+"
  "/"
] @operator

((identifier) @keyword
  (#match? @keyword "^(crud|router|views|typesense|taxonomies|relations|instance|post|refreshViews|events|indexes|mods|fetch|assign|record|datetime|email|password|boolean|string|number|object|array|enum)$"))

((token) @keyword
  (#match? @keyword "^(crud|router|views|typesense|taxonomies|relations|instance|post|refreshViews|events|indexes|mods)$"))
