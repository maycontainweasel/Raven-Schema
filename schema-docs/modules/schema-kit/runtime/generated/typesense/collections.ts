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

export interface UserDocument {
  id: string;
  email: string;
  firstName: string;
  surname: string;
  uniqueId: string;
}

export const collections: Record<string, TypesenseCollectionSchema> = {
  user: {
    "name": "user",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "email",
        "type": "string"
      },
      {
        "name": "firstName",
        "type": "string"
      },
      {
        "name": "surname",
        "type": "string",
        "sort": true
      },
      {
        "name": "uniqueId",
        "type": "string"
      }
    ],
    "enable_nested_fields": true
  },
};

export const collectionsMeta: Record<string, Record<string, unknown>> = {
  user: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "firstName",
        "surname",
        "email",
        "uniqueId"
      ],
      "queryByWeights": [
        1,
        1,
        1,
        1
      ]
    }
  },
};

export const collectionList = Object.values(collections);
