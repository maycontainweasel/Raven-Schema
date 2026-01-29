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

export interface AnnouncementDocument {
  id: string;
  title: string;
  message: string;
  style: string;
  severity: string;
  active: boolean;
  instances: string[];
  post: { status: string; createdAt: string; updatedAt: string };
}

export interface CommunicationDocument {
  id: string;
  subject: string;
  category: string;
  subcategory: string;
  tags: string[];
  status: string;
  priority: string;
  preview?: string;
  contact_name?: string;
  contact_email?: string;
  source_channel: string;
  source_instance: string;
  unread_admin_count: string;
  last_message_at: string;
  created_at: string;
}

export interface ExamDocument {
  id: string;
  key: string;
  title: string;
  titleShort: string;
  college: string;
  qidIndex: number;
  instances: string[];
  post: { status: string; createdAt: string; updatedAt: string };
}

export interface FaqDocument {
  id: string;
  question: string;
  answer: string;
  category: string;
  instances: string[];
  post: { status: string; createdAt: string; updatedAt: string };
}

export interface InstanceDocument {
  id: string;
  key: string;
  instance: string;
  title: string;
  status: string;
  active: boolean;
}

export interface NotificationDocument {
  id: string;
  title: string;
  summary: string;
  body: string;
  publishAt: string;
  order: number;
  active: boolean;
  instances: string[];
  post: { status: string; createdAt: string; updatedAt: string };
}

export interface OrdersDocument {
  id: string;
  stripeID: string;
  stripeOrderID: string;
  status: string;
  type: string;
  currency: string;
  amountTotal: number;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userSurname?: string;
  userEmail?: string;
  userCustomerID?: string;
  exam?: string;
  productID?: string;
  variantID?: string;
  extensionID?: string;
  instances: string[];
}

export interface OrganisationDocument {
  id: string;
  title: string;
  slug: string;
  description: string;
  active: boolean;
  instances: string[];
}

export interface ProductDocument {
  id: string;
  key: string;
  slug: string;
  title: string;
  description: string;
  stripePID: string;
  instances: string[];
}

export interface QuestionDocument {
  id: string;
  qid: number;
  question: string;
  explanation: string;
  source: string;
  instances: string[];
  optionsString: string;
  exams?: { id: string; title: string };
  categories?: { id: string; title: string };
  tags?: { id: string; title: string };
  topics?: { id: string; title: string };
  post: { id: string; status: string; createdAt: string; updatedAt: string };
}

export interface SessionDocument {
  id: string;
  title: string;
  mode: string;
  state: string;
  dateCreated: string;
  dateLastActive: string;
  qTotal: number;
  u: string;
  exams: string[];
}

export interface TestimonialDocument {
  id: string;
  name: string;
  role: string;
  organisation: string;
  quote: string;
  rating: number;
  order: number;
  instances: string[];
  post: { status: string; createdAt: string; updatedAt: string };
}

export interface UserDocument {
  id: string;
  email: string;
  firstName: string;
  surname: string;
  customerID: string;
  uniqueId: string;
  instances: string;
}

export const collections: Record<string, TypesenseCollectionSchema> = {
  announcement: {
    "name": "announcement",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "title",
        "type": "string",
        "sort": true
      },
      {
        "name": "message",
        "type": "string"
      },
      {
        "name": "style",
        "type": "string"
      },
      {
        "name": "severity",
        "type": "string"
      },
      {
        "name": "active",
        "type": "bool",
        "sort": true
      },
      {
        "name": "instances",
        "type": "string[]",
        "facet": true
      },
      {
        "name": "post",
        "type": "object",
        "fields": [
          {
            "name": "status",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "string"
          },
          {
            "name": "updatedAt",
            "type": "string"
          }
        ]
      }
    ],
    "enable_nested_fields": true,
    "default_sorting_field": "title"
  },
  communication: {
    "name": "communication",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "subject",
        "type": "string"
      },
      {
        "name": "category",
        "type": "string",
        "facet": true
      },
      {
        "name": "subcategory",
        "type": "string",
        "facet": true
      },
      {
        "name": "tags",
        "type": "string[]",
        "facet": true
      },
      {
        "name": "status",
        "type": "string",
        "facet": true
      },
      {
        "name": "priority",
        "type": "string",
        "facet": true
      },
      {
        "name": "preview",
        "type": "string",
        "optional": true
      },
      {
        "name": "contact_name",
        "type": "string",
        "optional": true
      },
      {
        "name": "contact_email",
        "type": "string",
        "optional": true
      },
      {
        "name": "source_channel",
        "type": "string",
        "facet": true
      },
      {
        "name": "source_instance",
        "type": "string",
        "facet": true
      },
      {
        "name": "unread_admin_count",
        "type": "string"
      },
      {
        "name": "last_message_at",
        "type": "string",
        "sort": true
      },
      {
        "name": "created_at",
        "type": "string"
      }
    ],
    "enable_nested_fields": true,
    "default_sorting_field": "last_message_at"
  },
  exam: {
    "name": "exam",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "key",
        "type": "string",
        "sort": true
      },
      {
        "name": "title",
        "type": "string",
        "sort": true
      },
      {
        "name": "titleShort",
        "type": "string"
      },
      {
        "name": "college",
        "type": "string"
      },
      {
        "name": "qidIndex",
        "type": "int32"
      },
      {
        "name": "instances",
        "type": "string[]",
        "facet": true
      },
      {
        "name": "post",
        "type": "object",
        "fields": [
          {
            "name": "status",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "string"
          },
          {
            "name": "updatedAt",
            "type": "string"
          }
        ]
      }
    ],
    "enable_nested_fields": true,
    "default_sorting_field": "title"
  },
  faq: {
    "name": "faq",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "question",
        "type": "string",
        "sort": true
      },
      {
        "name": "answer",
        "type": "string"
      },
      {
        "name": "category",
        "type": "string"
      },
      {
        "name": "instances",
        "type": "string[]",
        "facet": true
      },
      {
        "name": "post",
        "type": "object",
        "fields": [
          {
            "name": "status",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "string"
          },
          {
            "name": "updatedAt",
            "type": "string"
          }
        ]
      }
    ],
    "enable_nested_fields": true,
    "default_sorting_field": "question"
  },
  instance: {
    "name": "instance",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "key",
        "type": "string",
        "sort": true
      },
      {
        "name": "instance",
        "type": "string"
      },
      {
        "name": "title",
        "type": "string",
        "sort": true
      },
      {
        "name": "status",
        "type": "string",
        "facet": true
      },
      {
        "name": "active",
        "type": "bool",
        "facet": true
      }
    ],
    "enable_nested_fields": true,
    "default_sorting_field": "title"
  },
  notification: {
    "name": "notification",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "title",
        "type": "string"
      },
      {
        "name": "summary",
        "type": "string"
      },
      {
        "name": "body",
        "type": "string"
      },
      {
        "name": "publishAt",
        "type": "string",
        "sort": true
      },
      {
        "name": "order",
        "type": "int32",
        "sort": true
      },
      {
        "name": "active",
        "type": "bool"
      },
      {
        "name": "instances",
        "type": "string[]",
        "facet": true
      },
      {
        "name": "post",
        "type": "object",
        "fields": [
          {
            "name": "status",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "string"
          },
          {
            "name": "updatedAt",
            "type": "string"
          }
        ]
      }
    ],
    "enable_nested_fields": true,
    "default_sorting_field": "publishAt"
  },
  orders: {
    "name": "orders",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "stripeID",
        "type": "string"
      },
      {
        "name": "stripeOrderID",
        "type": "string"
      },
      {
        "name": "status",
        "type": "string",
        "sort": true
      },
      {
        "name": "type",
        "type": "string"
      },
      {
        "name": "currency",
        "type": "string"
      },
      {
        "name": "amountTotal",
        "type": "int32",
        "sort": true
      },
      {
        "name": "createdAt",
        "type": "string",
        "sort": true
      },
      {
        "name": "updatedAt",
        "type": "string"
      },
      {
        "name": "userName",
        "type": "string",
        "optional": true
      },
      {
        "name": "userSurname",
        "type": "string",
        "optional": true
      },
      {
        "name": "userEmail",
        "type": "string",
        "optional": true
      },
      {
        "name": "userCustomerID",
        "type": "string",
        "optional": true
      },
      {
        "name": "exam",
        "type": "string",
        "optional": true
      },
      {
        "name": "productID",
        "type": "string",
        "optional": true
      },
      {
        "name": "variantID",
        "type": "string",
        "optional": true
      },
      {
        "name": "extensionID",
        "type": "string",
        "optional": true
      },
      {
        "name": "instances",
        "type": "string[]",
        "facet": true
      }
    ],
    "enable_nested_fields": true,
    "default_sorting_field": "createdAt"
  },
  organisation: {
    "name": "organisation",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "title",
        "type": "string",
        "sort": true
      },
      {
        "name": "slug",
        "type": "string",
        "sort": true
      },
      {
        "name": "description",
        "type": "string"
      },
      {
        "name": "active",
        "type": "bool",
        "facet": true
      },
      {
        "name": "instances",
        "type": "string[]",
        "facet": true
      }
    ],
    "enable_nested_fields": true
  },
  product: {
    "name": "product",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "key",
        "type": "string",
        "sort": true
      },
      {
        "name": "slug",
        "type": "string"
      },
      {
        "name": "title",
        "type": "string",
        "sort": true
      },
      {
        "name": "description",
        "type": "string"
      },
      {
        "name": "stripePID",
        "type": "string"
      },
      {
        "name": "instances",
        "type": "string[]",
        "facet": true
      }
    ],
    "enable_nested_fields": true,
    "default_sorting_field": "title"
  },
  question: {
    "name": "question",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "qid",
        "type": "int32",
        "sort": true
      },
      {
        "name": "question",
        "type": "string"
      },
      {
        "name": "explanation",
        "type": "string"
      },
      {
        "name": "source",
        "type": "string"
      },
      {
        "name": "instances",
        "type": "string[]",
        "facet": true
      },
      {
        "name": "optionsString",
        "type": "string"
      },
      {
        "name": "exams",
        "type": "object",
        "optional": true,
        "fields": [
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "title",
            "type": "string"
          }
        ]
      },
      {
        "name": "categories",
        "type": "object",
        "optional": true,
        "fields": [
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "title",
            "type": "string"
          }
        ]
      },
      {
        "name": "tags",
        "type": "object",
        "optional": true,
        "fields": [
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "title",
            "type": "string"
          }
        ]
      },
      {
        "name": "topics",
        "type": "object",
        "optional": true,
        "fields": [
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "title",
            "type": "string"
          }
        ]
      },
      {
        "name": "post",
        "type": "object",
        "fields": [
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "status",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "string"
          },
          {
            "name": "updatedAt",
            "type": "string"
          }
        ]
      }
    ],
    "enable_nested_fields": true,
    "default_sorting_field": "qid"
  },
  session: {
    "name": "session",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "title",
        "type": "string"
      },
      {
        "name": "mode",
        "type": "string"
      },
      {
        "name": "state",
        "type": "string"
      },
      {
        "name": "dateCreated",
        "type": "string",
        "sort": true
      },
      {
        "name": "dateLastActive",
        "type": "string",
        "sort": true
      },
      {
        "name": "qTotal",
        "type": "int32",
        "sort": true
      },
      {
        "name": "u",
        "type": "string"
      },
      {
        "name": "exams",
        "type": "string[]"
      }
    ],
    "enable_nested_fields": true,
    "default_sorting_field": "dateCreated"
  },
  testimonial: {
    "name": "testimonial",
    "fields": [
      {
        "name": "id",
        "type": "string"
      },
      {
        "name": "name",
        "type": "string",
        "sort": true
      },
      {
        "name": "role",
        "type": "string"
      },
      {
        "name": "organisation",
        "type": "string"
      },
      {
        "name": "quote",
        "type": "string"
      },
      {
        "name": "rating",
        "type": "int32"
      },
      {
        "name": "order",
        "type": "int32",
        "sort": true
      },
      {
        "name": "instances",
        "type": "string[]",
        "facet": true
      },
      {
        "name": "post",
        "type": "object",
        "fields": [
          {
            "name": "status",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "string"
          },
          {
            "name": "updatedAt",
            "type": "string"
          }
        ]
      }
    ],
    "enable_nested_fields": true,
    "default_sorting_field": "order"
  },
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
        "name": "customerID",
        "type": "string"
      },
      {
        "name": "uniqueId",
        "type": "string"
      },
      {
        "name": "instances",
        "type": "string",
        "facet": true
      }
    ],
    "enable_nested_fields": true
  },
};

export const collectionsMeta: Record<string, Record<string, unknown>> = {
  announcement: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "title",
        "message"
      ],
      "queryByWeights": [
        2,
        1
      ],
      "filters": [
        "instances"
      ]
    },
    "fields": {
      "post": {
        "fields": {}
      }
    }
  },
  communication: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "subject",
        "preview",
        "contact_name",
        "contact_email",
        "subcategory",
        "category"
      ],
      "queryByWeights": [
        5,
        3,
        2,
        2,
        1,
        1
      ]
    }
  },
  exam: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "title"
      ],
      "queryByWeights": [
        1
      ]
    },
    "fields": {
      "post": {
        "fields": {}
      }
    }
  },
  faq: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "question",
        "answer",
        "category"
      ],
      "queryByWeights": [
        1,
        1,
        1
      ],
      "filters": [
        "instances"
      ]
    },
    "fields": {
      "post": {
        "fields": {}
      }
    }
  },
  instance: {
    "settings": {
      "queryBy": [
        "title",
        "key",
        "instance"
      ],
      "queryByWeights": [
        3,
        2,
        2
      ],
      "filters": [
        "status",
        "active"
      ]
    }
  },
  notification: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "title",
        "summary",
        "body"
      ],
      "queryByWeights": [
        2,
        1,
        1
      ],
      "filters": [
        "instances"
      ]
    },
    "fields": {
      "post": {
        "fields": {}
      }
    }
  },
  orders: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "id",
        "stripeID",
        "stripeOrderID",
        "userEmail",
        "userName",
        "userSurname",
        "userCustomerID"
      ],
      "queryByWeights": [
        6,
        4,
        4,
        3,
        2,
        2,
        2
      ]
    }
  },
  organisation: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "title",
        "slug",
        "description"
      ],
      "queryByWeights": [
        3,
        2,
        1
      ],
      "filters": [
        "instances",
        "active"
      ]
    }
  },
  product: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "title",
        "key",
        "slug"
      ],
      "queryByWeights": [
        3,
        2,
        1
      ]
    }
  },
  question: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "question",
        "explanation",
        "optionsString"
      ],
      "queryByWeights": [
        1,
        1,
        1
      ]
    },
    "fields": {
      "qid": {
        "sort": true
      },
      "exams": {
        "fields": {}
      },
      "categories": {
        "fields": {}
      },
      "tags": {
        "fields": {}
      },
      "topics": {
        "fields": {}
      },
      "post": {
        "fields": {}
      }
    }
  },
  session: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "title",
        "mode",
        "state"
      ],
      "queryByWeights": [
        2,
        1,
        1
      ]
    }
  },
  testimonial: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "name",
        "quote",
        "organisation"
      ],
      "queryByWeights": [
        2,
        2,
        1
      ],
      "filters": [
        "instances"
      ]
    },
    "fields": {
      "post": {
        "fields": {}
      }
    }
  },
  user: {
    "settings": {
      "synonyms": false,
      "searchAsYouType": false,
      "perDocumentSynonyms": false,
      "perDocumentSearchAsYouType": false,
      "queryBy": [
        "email",
        "firstName",
        "surname",
        "customerId",
        "uniqueId",
        "instances"
      ],
      "queryByWeights": [
        1,
        1,
        1,
        1,
        1,
        1
      ],
      "filters": [
        "instances"
      ]
    }
  },
};

export const collectionList = Object.values(collections);
