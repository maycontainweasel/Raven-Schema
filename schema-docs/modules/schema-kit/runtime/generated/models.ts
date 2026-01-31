// AUTO-GENERATED — models manifest for admin UI
export type ModelEntry = {
  table: string;
  data: 'local' | 'remote';
  slugPolicy?: string;
};

export const models = {
  "fruit": { table: "fruit", data: "local" },
  "question": { table: "q", data: "local" },
  "user": { table: "u", data: "local" },
  "instance": { table: "instance", data: "local" }
} as const;

export type ModelKey = keyof typeof models;
