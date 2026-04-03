// AUTO-GENERATED — Typesense collections + document types

export interface TypesenseField {
  name: string;
  type: string;
  facet?: boolean;
  optional?: boolean;
  sort?: boolean;
  fields?: TypesenseField[];
}

export interface TypesenseCollectionSchema {
  name: string;
  fields: TypesenseField[];
  [key: string]: unknown;
}

export const collections: Record<string, TypesenseCollectionSchema> = {
};

export const collectionsMeta: Record<string, Record<string, unknown>> = {
};

export const collectionList = Object.values(collections);
