version: 1
kind: table
name: Exam
primary: true
tableType: primary
description: Primary exam entity representing a single exam and its display metadata.
tags:
  - core
  - exam

table:
  model: "exam"
  type: "NORMAL"
  drop: false
  schemaMode: schemaless
  permissions: full

id:
  exportType: true
  type: string
  exportName: __NAME__ID
  structure: key

# Fields describe the full exam payload stored on the primary table.
fields:
  - key:
      type: string
      required: true
      default: ""
  - title:
      type: string
      required: true
      default: ""
  - titleShort:
      type: string
      required: false
      default: ""
  - description:
      type: string
      required: false
      default: ""
  - college:
      type: string
      required: false
      default: ""
  - sheetId:
      type: string
      required: false
      default: ""
  - qidIndex:
      type: integer
      required: true
      default: 0
  - order:
      type: integer
      required: false
      default: 0
  - instances:
      type: array
      items:
        type: string
      required: true
      default: []
  - colours:
      type: object
      required: false
      fields:
        gradient:
          type: object
          fields:
            first:
              type: string
              default: "#F1CB40"
            second:
              type: string
              default: "#FFDA52"
        primary:
          type: string
          default: "#F1CB40"
        secondary:
          type: string
          default: "#FFDA52"
      default:
        gradient:
          first: "#F1CB40"
          second: "#FFDA52"
        primary: "#F1CB40"
        secondary: "#FFDA52"

edges:
  has: []
  belongs: []

post:
  enabled: false

indexes:
  - name: ExamKey
    mode: OVERWRITE
    columns:
      - key
    unique: true
    comment: "Ensures each exam key is unique"

views:
  - name: AdminSingle
    mode: OVERWRITE
    type: normal
    fields:
      - "id"
      - "key"
      - "title"
    as:
      - titleShort: "titleShort"
      - college: "college"

  - name: Public
    mode: OVERWRITE
    type: normal
    fields:
      - "id"
      - "key"
      - "title"
      - "titleShort"
      - "description"
      - "colours"

  - name: Typesense
    mode: OVERWRITE
    type: normal
    fields:
      - "id"
      - "key"
      - "title"
    as:
      - rid: "record::id($this.id)"

crud:
  create:
    enabled: true
    name: create__NAME__
    params:
      - name: payload
        type: object
    options:
      idSource: key
      validations:
        required:
          - key
          - title
          - key

  update:
    enabled: true
    name: update__NAME__
    params:
      - name: rid
        type: record
      - name: payload
        type: object
    options:
      validations:
        required:
          - rid

  delete:
    enabled: true
    name: delete__NAME__
    params:
      - name: rid
        type: record
    options:
      validations:
        required:
          - rid

router:
  name: exam
  endpoints:
    - typesense:
        target: view
        value: Typesense
    - resource:
        adminSingle:
          target: view
          value: AdminSingle
        public:
          target: view
          value: Public
        typesense:
          target: view
          value: Typesense
    - create:
        target: crud
        value: create
    - update:
        target: crud
        value: update
    - delete:
        target: crud
        value: delete

delete:
  enabled: true
