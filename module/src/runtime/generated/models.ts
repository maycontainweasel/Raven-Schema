// AUTO-GENERATED — models manifest for schema-kit runtime
export type ModelEntry = {
  table: string;
  authority: 'source' | 'tenant';
  data: 'local' | 'remote';
  schemaType?: 'schemaless' | 'schemafull';
  slugPolicy?: string;
};

export const models = {
  "post": { table: "p", authority: "source", data: "local", schemaType: "schemaless" },
  "user": { table: "u", authority: "source", data: "local", schemaType: "schemaless" }
} as const;

export type ModelKey = keyof typeof models;
