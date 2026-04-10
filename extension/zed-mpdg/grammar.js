/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_-]*/;
const LABEL = /\*?[A-Za-z][A-Za-z0-9_-]*/;

module.exports = grammar({
  name: 'mpdg',

  extras: ($) => [
    /[ \t\r]+/,
  ],

  rules: {
    source_file: ($) =>
      repeat(choice($.newline, $.comment, $.stanza, $.field, $.edge, $.object, $.program_tag, $.token)),

    stanza: ($) =>
      prec.right(seq(
        $.stanza_header,
        repeat($.newline),
        $.fields_block,
        optional(seq(repeat($.newline), $.capabilities_block)),
        optional(seq(repeat($.newline), $.connections_block)),
        optional(seq(repeat($.newline), $.extras_block)),
      )),

    subtable: ($) =>
      prec.right(seq(
        $.subtable_header,
        repeat($.newline),
        $.fields_block,
        optional(seq(repeat($.newline), $.capabilities_block)),
        optional(seq(repeat($.newline), $.connections_block)),
        optional(seq(repeat($.newline), $.extras_block)),
      )),

    stanza_header: ($) =>
      seq(
        field('label', $.label_identifier),
        ',',
        field('model', $.identifier),
        optional(seq('|', field('description', $.description))),
      ),

    subtable_header: ($) =>
      seq(
        field('label', $.label_identifier),
        ',',
        field('model', $.identifier),
        optional(seq('|', field('description', $.description))),
      ),

    fields_block: ($) => seq('{', repeat(choice($.newline, $.comment, $.field, $.object, $.program_tag, $.token)), '}'),

    capabilities_block: ($) =>
      seq('[', repeat(choice($.newline, $.comment, $.capability_entry, $.object, $.program_tag, $.token)), ']'),

    connections_block: ($) =>
      seq('(', repeat(choice($.newline, $.comment, $.subtable, $.edge, $.field, $.object, $.program_tag, $.token)), ')'),

    extras_block: ($) => $.object,

    capability_entry: ($) =>
      prec.right(seq(
        field('name', $.identifier),
        optional(choice(
          seq(':', repeat1(choice($.program_tag, $.field_reference, $.object, $.array, $.paren_group, $.separator, $.string, $.number, $.boolean, $.identifier, $.operator, $.token))),
          $.paren_group,
        )),
      )),

    field: ($) =>
      prec.right(seq(
        field('name', $.field_name),
        optional(field('modifier', choice('!', '?'))),
        ':',
        repeat1(choice(
          $.program_tag,
          $.field_reference,
          $.object,
          $.array,
          $.paren_group,
          $.separator,
          $.string,
          $.number,
          $.boolean,
          $.identifier,
          $.operator,
          $.token,
        )),
      )),

    edge: ($) =>
      prec.right(seq(
        $.arrow,
        field('name', $.edge_identifier),
        $.arrow,
        field('target', $.edge_identifier),
        optional($.object),
      )),

    object: ($) =>
      seq(
        '{',
        repeat(choice($.newline, $.comment, $.property, $.program_tag, $.field_reference, $.array, $.paren_group, $.separator, $.object, $.string, $.number, $.boolean, $.identifier, $.operator, $.token)),
        '}',
      ),

    property: ($) =>
      prec.right(seq(
        field('key', $.identifier),
        ':',
        repeat1(choice($.program_tag, $.field_reference, $.object, $.array, $.paren_group, $.separator, $.string, $.number, $.boolean, $.identifier, $.operator, $.token)),
      )),

    array: ($) =>
      seq('[', repeat(choice($.newline, $.comment, $.program_tag, $.field_reference, $.object, $.array, $.paren_group, $.separator, $.string, $.number, $.boolean, $.identifier, $.operator, $.token)), ']'),

    paren_group: ($) =>
      seq('(', repeat(choice($.newline, $.comment, $.program_tag, $.field_reference, $.object, $.array, $.paren_group, $.separator, $.string, $.number, $.boolean, $.identifier, $.operator, $.token)), ')'),

    program_tag: ($) =>
      seq(
        '<',
        repeat(choice($.newline, $.program_tag, $.field_reference, $.object, $.array, $.paren_group, $.separator, $.string, $.number, $.boolean, $.identifier, $.operator, $.token)),
        '>',
      ),

    newline: () => /\n+/,
    field_reference: () => token(/\$[A-Za-z_][A-Za-z0-9_]*/),
    label_identifier: () => token(LABEL),
    field_name: () => token(IDENTIFIER),
    identifier: () => token(IDENTIFIER),
    edge_identifier: () => token(/[A-Za-z_][A-Za-z0-9_]*/),
    description: () => token(prec(1, /[^\n{}\[\]()]+/)),
    string: () => token(choice(/"([^"\\\n]|\\.)*"/, /'([^'\\\n]|\\.)*'/, /`([^`\\\n]|\\.)*`/)),
    number: () => token(choice(/-?\d+\.\d+/, /-?\d+/)),
    boolean: () => choice('true', 'false'),
    separator: () => token(choice(':', ',', '|', '.')),
    arrow: () => token(choice('->', '<-')),
    operator: () =>
      token(choice(
        '::',
        '=',
        '/',
        '*',
        '+',
      )),
    token: () => token(/[^\s{}\[\]()<>:,|!?-]+/),
    comment: () => token(choice(seq('//', /.*/), seq('#', /.*/))),
  },
});
