// AUTO-GENERATED — models manifest for schema-kit runtime
export type ModelEntry = {
  table: string;
  authority: 'source' | 'tenant';
  data: 'local' | 'remote';
  schemaType?: 'schemaless' | 'schemafull';
  slugPolicy?: string;
};

export const models = {
  "account": { table: "account", authority: "source", data: "local", schemaType: "schemaless" },
  "category": { table: "category", authority: "source", data: "local", schemaType: "schemaless" },
  "clarificationTask": { table: "clarificationtask", authority: "source", data: "local", schemaType: "schemaless" },
  "classificationRule": { table: "classificationrule", authority: "source", data: "local", schemaType: "schemaless" },
  "financialSpace": { table: "financialspace", authority: "source", data: "local", schemaType: "schemaless" },
  "merchant": { table: "merchant", authority: "source", data: "local", schemaType: "schemaless" },
  "monthlySnapshot": { table: "monthlysnapshot", authority: "source", data: "local", schemaType: "schemaless" },
  "statementImport": { table: "statementimport", authority: "source", data: "local", schemaType: "schemaless" },
  "statementRow": { table: "statementrow", authority: "source", data: "local", schemaType: "schemaless" },
  "transaction": { table: "transaction", authority: "source", data: "local", schemaType: "schemaless" },
  "user": { table: "u", authority: "source", data: "local", schemaType: "schemaless" }
} as const;

export type ModelKey = keyof typeof models;
