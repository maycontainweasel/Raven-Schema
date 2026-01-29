// Auto-generated from config/graph.mpdg. Do not edit manually.
// Run: pnpm run graph:mermaid

export const exam = {
  "label": "Exam",
  "model": "exam",
  "description": "Primary exam entity representing a single exam and its display metadata",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "$key",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "field",
      "idSource": "key"
    },
    {
      "name": "key",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "title",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "titleShort",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "description",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "college",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "sheetId",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "qidIndex",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "order",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "instances",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array",
      "tags": [],
      "isId": false
    },
    {
      "name": "colours",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [
        {
          "name": "gradient",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "type": "object",
          "tags": [],
          "children": [
            {
              "name": "first",
              "required": false,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": "#F1CB40",
              "type": "string",
              "tags": [],
              "isId": false
            },
            {
              "name": "second",
              "required": false,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": "#FFDA52",
              "type": "string",
              "tags": [],
              "isId": false
            }
          ],
          "isId": false
        },
        {
          "name": "primary",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "#F1CB40",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "secondary",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "#FFDA52",
          "type": "string",
          "tags": [],
          "isId": false
        }
      ],
      "isId": false
    }
  ],
  "caps": {
    "crudSlug": "key",
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[id, key, title, titleShort, college, order, qidIndex, sheetId, description, instances, colours](\npost: PID, [status, createdAt, updatedAt], {}, <{\nstatus: enum<\"publish\" | \"draft\">, <facet>\ncreatedAt: string,\nupdatedAt: string\n}>\n)\nPublic[id, key, title, titleShort, description, colours]",
    "rawTypesense": "exam::fn[id, key, title, titleShort, college, qidIndex](\nid: <RID>\ninstances: $instances, <array<string>> <facet>\npost: PID, [status, createdAt, updatedAt], {}, <{\nid: string,\nstatus: enum<\"publish\" | \"draft\">,\ncreatedAt: string,\nupdatedAt: string\n}>\n) {\nqueryBy: [title],\nqueryByWeights: [1],\nsortableFields: [title, key],\ndefaultSortingField: title\n}",
    "rawRelations": "exam->ExamQuestions->q {\ncardinality: many\nstoreOnModel: false\npayloadField: exams\nprocessor: functions\nrequired: true\n}\nexam -> ExamBuilderPage -> builderPage {\ncardinality: one\nstoreOnModel: false\npayloadField: builder\nprocessor: functions\n}",
    "instance": true,
    "moduleOptions": {
      "post": {
        "create": {
          "fields": {
            "title": "title"
          }
        }
      }
    },
    "post": true
  },
  "edges": [],
  "subTables": []
} as const;

export const u = {
  "label": "User",
  "model": "u",
  "description": "A basic user table",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "$email",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "field",
      "idSource": "email"
    },
    {
      "name": "email",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "email",
      "tags": [],
      "isId": false
    },
    {
      "name": "password",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "password",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "firstName",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "surname",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "uniqueId",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "type": "md5",
      "options": {
        "value": "$email"
      },
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "customerId",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[*],",
    "rawTaxonomies": "Role/Roles, role | User roles {} {\nhierarchical: false\ncardinality: one\nstoreOnModel: true\npayloadField: role\nprocessor: functions\n}",
    "rawTypesense": "user::fn[id, email, firstName, surname, customerID, uniqueId](\ninstances: $instances, <facet>\n) {\nqueryBy: [email, firstName, surname, customerId, uniqueId, instances],\nqueryByWeights: [1, 1, 1, 1, 1, 1],\nsortableFields: [surname],\nfilters: [instances]\n},",
    "post": true,
    "instanceMode": "remote",
    "moduleOptions": {
      "instance": {
        "mode": "remote"
      }
    },
    "instance": true
  },
  "edges": [],
  "subTables": [
    {
      "label": "UserProfile",
      "model": "uProfile",
      "description": "Stores user profile information such as medical history and biography",
      "fields": [
        {
          "name": "id",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "$parent",
          "type": "string",
          "tags": [],
          "isId": true,
          "idKind": "parent"
        },
        {
          "name": "address",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "avatar",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "bio",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "city",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "country",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<country>",
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "cover",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "credentials",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "levelOfTraining",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "medicalSchool",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "position",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "postalCode",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "primaryAffiliation",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "website",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "yearOfGraduation",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        }
      ],
      "tableType": "subsingle",
      "caps": {
        "routerEndpoints": [
          "update"
        ],
        "router": {}
      }
    },
    {
      "label": "UserExamDate",
      "model": "uExamDate",
      "description": "The date of a future exam of the user",
      "fields": [
        {
          "name": "id",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "S($parent, $exam)",
          "type": "string",
          "tags": [],
          "isId": true,
          "idKind": "field",
          "idSource": "stringID<parent, exam>"
        },
        {
          "name": "u",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<u>",
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "exam",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<exam>",
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "examDate",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "datetime",
          "tags": [],
          "isId": false
        },
        {
          "name": "createdAt",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "time::now()",
          "type": "datetime",
          "tags": [],
          "isId": false
        },
        {
          "name": "updatedAt",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "time::now()",
          "type": "datetime",
          "tags": [],
          "isId": false
        }
      ],
      "tableType": "submany",
      "caps": {
        "crud": "CUD",
        "router": {},
        "rawViews": "Single[*]"
      }
    }
  ]
} as const;

export const commEnv = {
  "label": "CommunicationEnvironment",
  "model": "commEnv",
  "description": "Communication environment catalogue (public/dashboard/session)",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "$key",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "field",
      "idSource": "key"
    },
    {
      "name": "key",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "\"\" unique",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "label",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "order",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "active",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": true,
      "type": "boolean",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[*]"
  },
  "edges": [],
  "subTables": []
} as const;

export const commCategory = {
  "label": "CommunicationCategory",
  "model": "commCategory",
  "description": "Communication category catalogue (per environment)",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "$key",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "field",
      "idSource": "key"
    },
    {
      "name": "key",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "\"\" unique",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "label",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "description",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "sourceChannel",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "public",
      "type": "enum<\"public\" | \"dashboard\" | \"session\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "category",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "general",
      "type": "enum<\"general\" | \"help\" | \"question-feedback\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "defaultTags",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array",
      "tags": [],
      "isId": false
    },
    {
      "name": "order",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "active",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": true,
      "type": "boolean",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[*]"
  },
  "edges": [],
  "subTables": []
} as const;

export const commThread = {
  "label": "CommunicationThread",
  "model": "commThread",
  "description": "Unified communication thread for admin inbox",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "subject",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "category",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "general",
      "type": "enum<\"general\" | \"help\" | \"question-feedback\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "subcategory",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "other",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "tags",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array",
      "tags": [],
      "isId": false
    },
    {
      "name": "sourceChannel",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "public",
      "type": "enum<\"public\" | \"dashboard\" | \"session\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "sourceInstance",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "sourceContext",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [
        {
          "name": "questionRid",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<q>",
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "moduleRid",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "sessionRid",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<s>",
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "examRid",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<exam>",
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "orderRid",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "url",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        }
      ],
      "isId": false
    },
    {
      "name": "contactProfile",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [
        {
          "name": "name",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "email",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "phoneNumber",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "userRid",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<u>",
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "instanceUserRid",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        }
      ],
      "isId": false
    },
    {
      "name": "status",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "new",
      "type": "enum<\"new\" | \"open\" | \"pending\" | \"closed\" | \"archived\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "priority",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "normal",
      "type": "enum<\"low\" | \"normal\" | \"high\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "assignedAdmin",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<u>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "unreadAdminCount",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "firstMessage",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<commMessage>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "lastMessage",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<commMessage>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "messageIds",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array",
      "tags": [],
      "isId": false
    },
    {
      "name": "createdAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "updatedAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "lastMessageAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "AdminList[id, subject, category, subcategory, tags, status, priority, sourceChannel, sourceInstance, contactProfile, unreadAdminCount, lastMessageAt, createdAt, lastMessage]\nAdminSingle[*]",
    "rawTypesense": "communication::fn[id, subject, category, subcategory, tags, status, priority](\nid: <RID>\npreview: (select value body from only $this.lastMessage), <optional>\ncontact_name: $this.contactProfile.name, <optional>\ncontact_email: $this.contactProfile.email, <optional>\nsource_channel: $this.sourceChannel, <facet>\nsource_instance: $this.sourceInstance, <facet>\nunread_admin_count: $this.unreadAdminCount\nlast_message_at: time::unix($this.lastMessageAt)\ncreated_at: time::unix($this.createdAt)\ntags: $tags, <array<string>> <facet>\ncategory: $category, <facet>\nsubcategory: $subcategory, <facet>\nstatus: $status, <facet>\npriority: $priority, <facet>\n) {\nsortableFields: [last_message_at],\ndefaultSortingField: last_message_at,\nqueryBy: [\"subject\", \"preview\", \"contact_name\", \"contact_email\", \"subcategory\", \"category\"],\nqueryByWeights: [5, 3, 2, 2, 1, 1],\n}"
  },
  "edges": [],
  "subTables": []
} as const;

export const commMessage = {
  "label": "CommunicationMessage",
  "model": "commMessage",
  "description": "Message inside a communication thread",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "thread",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<commThread>",
      "tags": [],
      "isId": false
    },
    {
      "name": "direction",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "inbound",
      "type": "enum<\"inbound\" | \"outbound\" | \"system\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "authorProfile",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [
        {
          "name": "name",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "email",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "role",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "user",
          "type": "enum<\"user\" | \"admin\" | \"system\">",
          "tags": [],
          "isId": false
        },
        {
          "name": "userRid",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<u>",
          "assign": true,
          "tags": [],
          "isId": false
        }
      ],
      "isId": false
    },
    {
      "name": "body",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "richBody",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [],
      "isId": false
    },
    {
      "name": "metadata",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [],
      "isId": false
    },
    {
      "name": "tags",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array",
      "tags": [],
      "isId": false
    },
    {
      "name": "createdAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "readAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[*]"
  },
  "edges": [],
  "subTables": []
} as const;

export const pmInstance = {
  "label": "PMInstance",
  "model": "pmInstance",
  "description": "Website instance configuration (deployment settings)",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "$key",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "field",
      "idSource": "key"
    },
    {
      "name": "key",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "instance",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<instance>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "title",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "status",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "active",
      "type": "enum<\"active\" | \"inactive\" | \"maintenance\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "active",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": true,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "flag",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "description",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "domains",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<string>",
      "tags": [],
      "isId": false
    },
    {
      "name": "primaryDomain",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "locale",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "en-GB",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "timezone",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "Europe/London",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "currency",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "GBP",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "currencies",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<string>",
      "tags": [],
      "isId": false
    },
    {
      "name": "pricingOptions",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<number>",
      "tags": [],
      "isId": false
    },
    {
      "name": "apiKeys",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [],
      "isId": false
    },
    {
      "name": "surrealdb",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [
        {
          "name": "url",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "namespace",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "database",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "user",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "pass",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        }
      ],
      "isId": false
    },
    {
      "name": "redis",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [
        {
          "name": "host",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "port",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "password",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "database",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        }
      ],
      "isId": false
    },
    {
      "name": "content",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [],
      "isId": false
    },
    {
      "name": "createdAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "updatedAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "createdBy",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crudSlug": "key",
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[*],",
    "rawTypesense": "",
    "instance": true
  },
  "edges": [],
  "subTables": []
} as const;

export const instance = {
  "label": "Instance",
  "model": "instance",
  "description": "Website instance configuration (module overlay)",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "$key",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "field",
      "idSource": "key"
    },
    {
      "name": "key",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "instance",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "title",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "status",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "active",
      "type": "enum<\"active\" | \"inactive\" | \"maintenance\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "active",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": true,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "flag",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "description",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "domains",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<string>",
      "tags": [],
      "isId": false
    },
    {
      "name": "primaryDomain",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "locale",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "en-GB",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "timezone",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "Europe/London",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "currency",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "GBP",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "currencies",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<string>",
      "tags": [],
      "isId": false
    },
    {
      "name": "pricingOptions",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<number>",
      "tags": [],
      "isId": false
    },
    {
      "name": "apiKeys",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [],
      "isId": false
    },
    {
      "name": "surrealdb",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [
        {
          "name": "url",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "namespace",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "database",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "user",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "pass",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        }
      ],
      "isId": false
    },
    {
      "name": "redis",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [
        {
          "name": "host",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "port",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "password",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "database",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        }
      ],
      "isId": false
    },
    {
      "name": "content",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [],
      "isId": false
    },
    {
      "name": "createdAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "updatedAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "createdBy",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "moduleTarget": "instance",
    "rawViews": "Admin[*],",
    "rawTypesense": "",
    "instance": true
  },
  "edges": [],
  "subTables": []
} as const;

export const organisation = {
  "label": "Organisation",
  "model": "organisation",
  "description": "Company/organisation record",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "$slug",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "field",
      "idSource": "slug"
    },
    {
      "name": "title",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "slug",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "description",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "website",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "email",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "phone",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "industry",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "size",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "logo",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "address",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [
        {
          "name": "line1",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "line2",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "city",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "region",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "postcode",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "country",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        }
      ],
      "isId": false
    },
    {
      "name": "instances",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<string>",
      "tags": [],
      "isId": false
    },
    {
      "name": "active",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": true,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "createdAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "updatedAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crudSlug": "slug",
    "crud": "CUD",
    "router": {},
    "instance": true,
    "rawViews": "Admin[*],",
    "rawTypesense": "organisation::fn[id, title, slug, description, active](\ninstances: $instances || [], <array<string>> <facet>\n) {\nqueryBy: [title, slug, description],\nqueryByWeights: [3, 2, 1],\nsortableFields: [title, slug],\nfilters: [instances, active]\n}",
    "rawRelations": "organisation->OrganisationUsers->u {\ncardinality: many\nstoreOnModel: false\npayloadField: users\nprocessor: functions\n}"
  },
  "edges": [],
  "subTables": []
} as const;

export const OrganisationUsers = {
  "label": "Organisation User",
  "model": "OrganisationUsers",
  "description": "User membership in an organisation",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "organisation",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<organisation>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "u",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<u>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "role",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "member",
      "type": "enum<\"member\" | \"admin\" | \"owner\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "addedAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CU",
    "router": {}
  },
  "edges": [],
  "subTables": []
} as const;

export const q = {
  "label": "Question",
  "model": "q",
  "description": "A basic question table",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "$qid",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "field",
      "idSource": "qid"
    },
    {
      "name": "qid",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "qCode",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "question",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "explanation",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "explanationRef",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "source",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "instances",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<string>",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin::fn[*](\npost: PID, [status, createdAt, updatedAt], {},\nid: <RID>,\noptionsString: (\"\"),\ninstances: $instances || [], <array<string>> <facet>,\nexams?: ([]), <array<{\nid: string,\ntitle: string,\n}>>\ncategories?: ([]), <array<{\nid: string,\ntitle: string,\n}>>\ntags?: ([]), <array<{\nid: string,\ntitle: string,\n}>>\ntopics?: ([]), <array<{\nid: string,\ntitle: string,\n}>>\npost: PID, [status, createdAt, updatedAt], {},\n),\nSession::fn[*](\noptions: *ST|qOption, [id, label, correct, order], {}\n),",
    "instance": true,
    "post": true,
    "rawTaxonomies": "Category/Categories, qcat | Question categories {} {\nhierarchical: true\nstoreOnModel: false\npayloadField: categories\nprocessor: functions\n}\nTag/Tags, qtag | Question tags {} {\nhierarchical: false\nstoreOnModel: true\npayloadField: tags\nprocessor: functions\n}\nTopic/Topics, qtopic | Question topics {} {\nhierarchical: true\nstoreOnModel: false\npayloadField: topics\nprocessor: functions\n}",
    "rawTypesense": "question::fn![qCode, explanationRef](\nid: <RID>,\noptionsString: (\"\"),\ninstances: $instances || [], <array<string>> <facet>,\nqid: $qid, <number> <sortable>\nexams?: ([]), <array<{\nid: string,\ntitle: string,\n}>>\ncategories?: ([]), <array<{\nid: string,\ntitle: string,\n}>>\ntags?: ([]), <array<{\nid: string,\ntitle: string,\n}>>\ntopics?: ([]), <array<{\nid: string,\ntitle: string,\n}>>\npost: ({\nstatus: \"\",\ncreatedAt: \"\",\nupdatedAt: \"\",\n}),  <{\nid: string,\nstatus: \"publish\" | \"draft\",\ncreatedAt: string,\nupdatedAt: string\n}>\n) {\nqueryBy: [\"question\", \"explanation\", \"optionsString\"],\nqueryByWeights: [1, 1, 1],\nsortableFields: [qid],\ndefaultSortingField: qid,\n},",
    "rawRelations": "exam->ExamQuestions->q {\ncardinality: many\nstoreOnModel: false\npayloadField: exams\nprocessor: functions\nrequired: true\n}"
  },
  "edges": [],
  "subTables": [
    {
      "label": "QuestionOption",
      "model": "qOption",
      "description": "Multiple choice options",
      "fields": [
        {
          "name": "optionKey",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "type": "md5",
          "options": {
            "value": "$label"
          },
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "id",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "S($parent, $optionKey)",
          "type": "string",
          "tags": [],
          "isId": true,
          "idKind": "field",
          "idSource": "stringID<parent, optionKey>"
        },
        {
          "name": "label",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "correct",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": false,
          "type": "boolean",
          "tags": [],
          "isId": false
        },
        {
          "name": "order",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        }
      ],
      "tableType": "submany",
      "caps": {
        "crud": "CUD",
        "router": {}
      },
      "subTables": [
        {
          "label": "QuestionOptionRecord",
          "model": "qor",
          "description": "Question option performance stats",
          "fields": [
            {
              "name": "id",
              "required": false,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": "S($q, $qOption)",
              "type": "string",
              "tags": [],
              "isId": true,
              "idKind": "field",
              "idSource": "stringID<q, qOption>"
            },
            {
              "name": "q",
              "required": true,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": "",
              "type": "record<q>",
              "assign": true,
              "tags": [],
              "isId": false
            },
            {
              "name": "qOption",
              "required": true,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": "",
              "type": "record<qOption>",
              "assign": true,
              "tags": [],
              "isId": false
            },
            {
              "name": "attempts",
              "required": false,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": 0,
              "type": "number",
              "tags": [],
              "isId": false
            },
            {
              "name": "noCorrect",
              "required": false,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": 0,
              "type": "number",
              "tags": [],
              "isId": false
            },
            {
              "name": "noIncorrect",
              "required": false,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": 0,
              "type": "number",
              "tags": [],
              "isId": false
            },
            {
              "name": "percCorrect",
              "required": false,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": 0,
              "type": "number",
              "tags": [],
              "isId": false
            }
          ],
          "tableType": "subsingle",
          "caps": {
            "crud": "CUD"
          }
        },
        {
          "label": "UserQuestionOptionRecord",
          "model": "uqor",
          "description": "User option performance stats",
          "fields": [
            {
              "name": "id",
              "required": false,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": "S($u, $qOption)",
              "type": "string",
              "tags": [],
              "isId": true,
              "idKind": "field",
              "idSource": "stringID<u, qOption>"
            },
            {
              "name": "u",
              "required": true,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": "",
              "type": "record<u>",
              "assign": true,
              "tags": [],
              "isId": false
            },
            {
              "name": "qOption",
              "required": true,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": "",
              "type": "record<qOption>",
              "assign": true,
              "tags": [],
              "isId": false
            },
            {
              "name": "attempts",
              "required": false,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": 0,
              "type": "number",
              "tags": [],
              "isId": false
            },
            {
              "name": "correct",
              "required": false,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": 0,
              "type": "number",
              "tags": [],
              "isId": false
            },
            {
              "name": "incorrect",
              "required": false,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": 0,
              "type": "number",
              "tags": [],
              "isId": false
            },
            {
              "name": "percCorrect",
              "required": false,
              "nullable": false,
              "ignorePayload": false,
              "defaultValue": 0,
              "type": "number",
              "tags": [],
              "isId": false
            }
          ],
          "tableType": "submany",
          "caps": {
            "crud": "CUD"
          }
        }
      ]
    },
    {
      "label": "QuestionPerformanceRecord",
      "model": "qpr",
      "description": "Aggregate performance for this question",
      "fields": [
        {
          "name": "id",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "$parent",
          "type": "string",
          "tags": [],
          "isId": true,
          "idKind": "parent"
        },
        {
          "name": "attempts",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "noCorrect",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "noIncorrect",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "percCorrect",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "totalTime",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "averageTime",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        }
      ],
      "tableType": "subsingle",
      "caps": {
        "crud": "CUD"
      }
    },
    {
      "label": "UserQuestionPerformanceRecord",
      "model": "uqpr",
      "description": "Aggregate performance for this question for a given user",
      "fields": [
        {
          "name": "id",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "$parent",
          "type": "string",
          "tags": [],
          "isId": true,
          "idKind": "parent"
        },
        {
          "name": "attempts",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "noCorrect",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "noIncorrect",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "percCorrect",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "totalTime",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "averageTime",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        }
      ],
      "tableType": "submany",
      "caps": {
        "crud": "CUD"
      }
    },
    {
      "label": "QuestionNote",
      "model": "qnote",
      "description": "Administrative admin notes for questions",
      "fields": [
        {
          "name": "id",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "$parent",
          "type": "string",
          "tags": [],
          "isId": true,
          "idKind": "parent"
        },
        {
          "name": "q",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<q>",
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "note",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "order",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "createdAt",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "time::now()",
          "type": "datetime",
          "tags": [],
          "isId": false
        },
        {
          "name": "createdBy",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<u>",
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "createdByName",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "updatedAt",
          "required": false,
          "nullable": false,
          "ignorePayload": true,
          "defaultValue": "",
          "type": "datetime",
          "tags": [],
          "isId": false
        },
        {
          "name": "updatedBy",
          "required": false,
          "nullable": false,
          "ignorePayload": true,
          "defaultValue": "",
          "type": "record<u>",
          "tags": [],
          "isId": false
        }
      ],
      "tableType": "submany",
      "caps": {
        "crud": "CUD",
        "router": {}
      }
    },
    {
      "label": "UserQuestionNote",
      "model": "uqnote",
      "description": "User notes for questions",
      "fields": [
        {
          "name": "id",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "$parent",
          "type": "string",
          "tags": [],
          "isId": true,
          "idKind": "parent"
        },
        {
          "name": "u",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<u>",
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "q",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<q>",
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "note",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "order",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        }
      ],
      "tableType": "submany",
      "caps": {
        "crud": "CUD",
        "router": {}
      }
    }
  ]
} as const;

export const builderPage = {
  "label": "BuilderPage",
  "model": "builderPage",
  "description": "Page-level container for builder content",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "title",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "createdAt",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "updatedAt",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[*]",
    "rawRelations": "builderPage -> BuilderFrames -> builderFrame {\ncardinality: many\nstoreOnModel: false\npayloadField: frames\nprocessor: functions\n}"
  },
  "edges": [],
  "subTables": []
} as const;

export const builderFrame = {
  "label": "BuilderFrame",
  "model": "builderFrame",
  "description": "Layout frame (rows/columns) for a builder page",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "page",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<builderPage>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "parent",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<builderFrame>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "order",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "kind",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "frame",
      "type": "enum<\"frame\" | \"row\" | \"column\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "className",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "wrapperClass",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "elementId",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "createdAt",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "updatedAt",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[*]",
    "rawRelations": "builderFrame -> BuilderFrames -> builderFrame {\ncardinality: many\nstoreOnModel: false\npayloadField: children\nprocessor: functions\n}\nbuilderFrame -> BuilderWidgets -> builderWidget {\ncardinality: many\nstoreOnModel: false\npayloadField: widgets\nprocessor: functions\n}"
  },
  "edges": [],
  "subTables": []
} as const;

export const builderWidget = {
  "label": "BuilderWidget",
  "model": "builderWidget",
  "description": "Content widget tied to a frame",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "frame",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<builderFrame>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "order",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "type",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "html",
      "type": "enum<\"html\" | \"heading\" | \"text\" | \"spacer\" | \"list-ordered\" | \"list-unordered\" | \"image\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "data",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [],
      "isId": false
    },
    {
      "name": "className",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "wrapperClass",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "elementId",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "createdAt",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "updatedAt",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[*]"
  },
  "edges": [],
  "subTables": []
} as const;

export const product = {
  "label": "Product",
  "model": "product",
  "description": "Exam product (local, Stripe-linked)",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "$key",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "field",
      "idSource": "key"
    },
    {
      "name": "key",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "slug",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "title",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "description",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "stripePID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "instances",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<string>",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crudSlug": "key",
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[id, key, slug, title, description, stripePID, instances](\nexams: (select value ->ProductExams.out from only $this.id)\n)",
    "rawTypesense": "product::fn[id, key, slug, title, description, stripePID](\ninstances: $instances || [], <array<string>> <facet>\n) {\nqueryBy: [title, key, slug],\nqueryByWeights: [3, 2, 1],\nsortableFields: [title, key],\ndefaultSortingField: title\n}",
    "rawRelations": "product -> ProductExams -> exam {\ncardinality: many\nstoreOnModel: false\npayloadField: exams\nprocessor: functions\nrequired: true\n}\nproduct -> ProductVariants -> productVariant {\ncardinality: many\nstoreOnModel: false\npayloadField: variants\nprocessor: functions\n}",
    "instance": true,
    "post": true
  },
  "edges": [],
  "subTables": []
} as const;

export const productVariant = {
  "label": "ProductVariant",
  "model": "productVariant",
  "description": "Price variant (period + currency)",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "S($productKey, $period, $currency)",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "field",
      "idSource": "stringID<productKey, period, currency>"
    },
    {
      "name": "productKey",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "examKey",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "product",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<product>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "exam",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<exam>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "period",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "int",
      "tags": [],
      "isId": false
    },
    {
      "name": "currency",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<currency>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "value",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "label",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "stripePriceID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawRelations": "productVariant -> VariantExtensionProduct -> extensionProduct {\ncardinality: one\nstoreOnModel: false\npayloadField: extensionProduct\nprocessor: functions\n}"
  },
  "edges": [],
  "subTables": []
} as const;

export const extensionProduct = {
  "label": "ExtensionProduct",
  "model": "extensionProduct",
  "description": "Extension Stripe product per variant",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "S($productKey, $period, $currency)",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "field",
      "idSource": "stringID<productKey, period, currency>"
    },
    {
      "name": "productKey",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "examKey",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "product",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<product>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "exam",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<exam>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "productVariant",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<productVariant>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "period",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "int",
      "tags": [],
      "isId": false
    },
    {
      "name": "currency",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<currency>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "stripePID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawRelations": "extensionProduct -> ExtensionVariants -> extensionVariant {\ncardinality: many\nstoreOnModel: false\npayloadField: variants\nprocessor: functions\n}"
  },
  "edges": [],
  "subTables": []
} as const;

export const extensionVariant = {
  "label": "ExtensionVariant",
  "model": "extensionVariant",
  "description": "Extension price (days + price)",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "S($productKey, $period, $currency, $numberOfDays)",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "field",
      "idSource": "stringID<productKey, period, currency, numberOfDays>"
    },
    {
      "name": "productKey",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "examKey",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "product",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<product>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "exam",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<exam>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "productVariant",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<productVariant>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "extensionProduct",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<extensionProduct>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "period",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "int",
      "tags": [],
      "isId": false
    },
    {
      "name": "currency",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<currency>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "numberOfDays",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "int",
      "tags": [],
      "isId": false
    },
    {
      "name": "value",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "stripePriceID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {}
  },
  "edges": [],
  "subTables": []
} as const;

export const order = {
  "label": "Order",
  "model": "order",
  "description": "Stripe-backed order record (single-item default)",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "u",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<u>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "uSubscription",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<uSubscription>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "exam",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<exam>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "productID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<product>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "variantID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<productVariant>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "extensionID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<extensionVariant>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "type",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "product",
      "type": "enum<\"product\" | \"subscribe\" | \"dashboard\" | \"extension\" | \"trial\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "status",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "processing",
      "type": "enum<\"processing\" | \"completed\" | \"requires_action\" | \"refunded\" | \"cancelled\" | \"pending\" | \"paid\" | \"failed\" | \"canceled\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "currency",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<currency>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "amountSubtotal",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "amountTax",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "amountDiscount",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "amountTotal",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "amountRefunded",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "stripeID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "stripeOrderID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "paymentIntentID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "checkoutSessionID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "chargeID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "customerID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "invoiceID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "paymentMethodID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "stripePriceID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "stripeProductID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "subscriptionID",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "receiptURL",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "couponApplied",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": false,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "couponCode",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "items",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array",
      "tags": [],
      "isId": false
    },
    {
      "name": "access",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [
        {
          "name": "products",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": [],
          "type": "array",
          "tags": [],
          "isId": false
        },
        {
          "name": "exams",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": [],
          "type": "array",
          "tags": [],
          "isId": false
        },
        {
          "name": "from",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "to",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        }
      ],
      "isId": false
    },
    {
      "name": "userSnapshot",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [
        {
          "name": "email",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "name",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        }
      ],
      "isId": false
    },
    {
      "name": "paymentSnapshot",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [
        {
          "name": "brand",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "last4",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        }
      ],
      "isId": false
    },
    {
      "name": "events",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array",
      "tags": [],
      "isId": false
    },
    {
      "name": "metadata",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [],
      "isId": false
    },
    {
      "name": "stripePayload",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [],
      "isId": false
    },
    {
      "name": "createdAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "updatedAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "time::now()",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "instances",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<string>",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[id, stripeID, stripeOrderID, status, type, currency, amountTotal, amountRefunded, createdAt, updatedAt](\nu: (select id, email, firstName, surname, customerID from only $this.u),\nitems: $items,\nexam: $exam,\nproductID: $productID,\nvariantID: $variantID,\nextensionID: $extensionID\n)",
    "rawTypesense": "orders::fn[id, stripeID, stripeOrderID, status, type, currency, amountTotal](\nid: <RID>\ncreatedAt: time::unix($this.createdAt)\nupdatedAt: time::unix($this.updatedAt)\nuserName: (select value firstName from only $this.u), <optional>\nuserSurname: (select value surname from only $this.u), <optional>\nuserEmail: (select value email from only $this.u), <optional>\nuserCustomerID: (select value customerID from only $this.u), <optional>\nexam: $exam, <RID> <optional>\nproductID: $productID, <RID> <optional>\nvariantID: $variantID, <RID> <optional>\nextensionID: $extensionID, <RID> <optional>\ninstances: $instances || [], <array<string>> <facet>\n) {\ncollection: orders\nqueryBy: [id, stripeID, stripeOrderID, userEmail, userName, userSurname, userCustomerID]\nqueryByWeights: [6, 4, 4, 3, 2, 2, 2]\nsortableFields: [createdAt, amountTotal, status]\ndefaultSortingField: createdAt\n}",
    "rawRelations": "order -> OrderProduct -> product {\ncardinality: one\nstoreOnModel: false\npayloadField: product\nprocessor: functions\n}\norder -> OrderProductVariant -> productVariant {\ncardinality: one\nstoreOnModel: false\npayloadField: variant\nprocessor: functions\n}\norder -> OrderExtensionProduct -> extensionProduct {\ncardinality: one\nstoreOnModel: false\npayloadField: extensionProduct\nprocessor: functions\n}\norder -> OrderExtensionVariant -> extensionVariant {\ncardinality: one\nstoreOnModel: false\npayloadField: extensionVariant\nprocessor: functions\n}\norder -> OrderTrialProduct -> product {\ncardinality: one\nstoreOnModel: false\npayloadField: trialProduct\nprocessor: functions\n}\norder -> ProductOrders -> product {\ncardinality: many\nstoreOnModel: false\npayloadField: products\nprocessor: functions\n}",
    "instance": true
  },
  "edges": [],
  "subTables": [
    {
      "label": "OrderItem",
      "model": "orderItem",
      "description": "Line item snapshot",
      "fields": [
        {
          "name": "id",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "default",
          "type": "string",
          "tags": [],
          "isId": true,
          "idKind": "default"
        },
        {
          "name": "kind",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "product",
          "type": "enum<\"product\" | \"productVariant\" | \"extensionProduct\" | \"extensionVariant\" | \"exam\" | \"other\">",
          "tags": [],
          "isId": false
        },
        {
          "name": "refTable",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "refId",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "label",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "description",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "quantity",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 1,
          "type": "int",
          "tags": [],
          "isId": false
        },
        {
          "name": "unitAmount",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "totalAmount",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "number",
          "tags": [],
          "isId": false
        },
        {
          "name": "currency",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "record<currency>",
          "assign": true,
          "tags": [],
          "isId": false
        },
        {
          "name": "period",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "int",
          "tags": [],
          "isId": false
        },
        {
          "name": "numberOfDays",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": 0,
          "type": "int",
          "tags": [],
          "isId": false
        },
        {
          "name": "stripePriceID",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "instance",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "metadata",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "type": "object",
          "tags": [],
          "children": [],
          "isId": false
        }
      ],
      "tableType": "submany",
      "caps": {
        "crud": "CUD",
        "router": {}
      }
    },
    {
      "label": "OrderEvent",
      "model": "orderEvent",
      "description": "Timeline event for order journey",
      "fields": [
        {
          "name": "id",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "default",
          "type": "string",
          "tags": [],
          "isId": true,
          "idKind": "default"
        },
        {
          "name": "type",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "system",
          "type": "enum<\"system\" | \"payment\" | \"fulfilment\" | \"customer\" | \"error\">",
          "tags": [],
          "isId": false
        },
        {
          "name": "title",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "description",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "occurredAt",
          "required": true,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "time::now()",
          "type": "datetime",
          "tags": [],
          "isId": false
        },
        {
          "name": "actor",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "severity",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "info",
          "type": "enum<\"info\" | \"warning\" | \"error\">",
          "tags": [],
          "isId": false
        },
        {
          "name": "status",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "code",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "defaultValue": "",
          "type": "string",
          "tags": [],
          "isId": false
        },
        {
          "name": "metadata",
          "required": false,
          "nullable": false,
          "ignorePayload": false,
          "type": "object",
          "tags": [],
          "children": [],
          "isId": false
        }
      ],
      "tableType": "submany",
      "caps": {
        "crud": "CUD",
        "router": {}
      }
    }
  ]
} as const;

export const s = {
  "label": "Session",
  "model": "s",
  "description": "Core session record (user-specific)",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "uuid",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "title",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "New Session",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "mode",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "learn",
      "type": "enum<\"learn\" | \"exam\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "state",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "untouched",
      "type": "enum<\"untouched\" | \"in-progress\" | \"paused\" | \"complete\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "active",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": true,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "dateCreated",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "dateLastActive",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "dateLastTouch",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "dateCompleted",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "index",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "qTotal",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "familiarity",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "all",
      "type": "enum<\"all\" | \"new\" | \"incorrect\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "u",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<u>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "exams",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<record<exam>>",
      "tags": [],
      "isId": false
    },
    {
      "name": "categories",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<{ id: record<exam>, categories: record<qt>[] }>",
      "tags": [],
      "isId": false
    },
    {
      "name": "timing",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "type": "object",
      "tags": [],
      "children": [],
      "isId": false
    },
    {
      "name": "qids",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<record<q>>",
      "tags": [],
      "isId": false
    },
    {
      "name": "qidsInit",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": false,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "qActiveID",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "record<q>",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin::fn[*](\npost: PID, [status, createdAt, updatedAt], {},\nid: <RID>,\nu: $u,\nexams: $exams,\ncategories: $categories,\ntiming: $timing\n)",
    "rawTypesense": "session::fn[id, title, mode, state, dateCreated, dateLastActive, qTotal](\nu: $u,\nexams: $exams\n) {\nqueryBy: [title, mode, state],\nqueryByWeights: [2, 1, 1],\nsortableFields: [dateCreated, dateLastActive, qTotal],\ndefaultSortingField: dateCreated\n}",
    "rawRelations": "s->SessionQuestions->q {\ncardinality: many\nstoreOnModel: false\npayloadField: questions\nprocessor: functions\n}\ns->SessionAttempts->qa {\ncardinality: many\nstoreOnModel: false\npayloadField: attempts\nprocessor: functions\n}\ns->SessionRecord->spr {\ncardinality: one\nstoreOnModel: false\npayloadField: record\nprocessor: functions\n}\ns->SessionLog->slog {\ncardinality: one\nstoreOnModel: false\npayloadField: log\nprocessor: functions\n}\ns->SessionCategories->qt {\ncardinality: many\nstoreOnModel: false\npayloadField: categories\nprocessor: functions\n}\ns->SessionCategoryRecords->scr {\ncardinality: many\nstoreOnModel: false\npayloadField: categoryRecords\nprocessor: functions\n}\nu->UserSessions->s {\ncardinality: many\nstoreOnModel: false\npayloadField: sessions\nprocessor: functions\n}\nexam->ExamSessions->s {\ncardinality: many\nstoreOnModel: false\npayloadField: sessions\nprocessor: functions\n}"
  },
  "edges": [],
  "subTables": []
} as const;

export const spr = {
  "label": "Session Performance Record",
  "model": "spr",
  "description": "Aggregate session performance",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "s",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<s>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "u",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<u>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "qTotal",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "attempts",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "noCorrect",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "noIncorrect",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "noComplete",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "noIncomplete",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "percComplete",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "percCorrect",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "percCorrectAttempted",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "totalSessionTime",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "averageTimePerQ",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CU",
    "router": {}
  },
  "edges": [],
  "subTables": []
} as const;

export const scr = {
  "label": "Session Category Record",
  "model": "scr",
  "description": "Per-category performance in a session",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "s",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<s>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "qt",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<qt>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "attempts",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "noCorrect",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "noIncorrect",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "percCorrect",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "averageTime",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "totalTime",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CU",
    "router": {}
  },
  "edges": [],
  "subTables": []
} as const;

export const slog = {
  "label": "Session Log",
  "model": "slog",
  "description": "Session timeline container",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "s",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<s>",
      "assign": true,
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CU",
    "router": {}
  },
  "edges": [],
  "subTables": []
} as const;

export const se = {
  "label": "Session Event",
  "model": "se",
  "description": "Timeline event for a session",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "action",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "time",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "payload",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "type": "object",
      "tags": [],
      "children": [],
      "isId": false
    },
    {
      "name": "q",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "record<q>",
      "tags": [],
      "isId": false
    },
    {
      "name": "sq",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "record<SessionQuestions>",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {}
  },
  "edges": [],
  "subTables": []
} as const;

export const SessionQuestions = {
  "label": "Session Question",
  "model": "SessionQuestions",
  "description": "Session-specific question metadata",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "s",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<s>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "q",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<q>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "order",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "flagged",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": false,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "complete",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": false,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "startTS",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "answerTS",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "totalTime",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "lastUpdated",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CU",
    "router": {}
  },
  "edges": [],
  "subTables": []
} as const;

export const qa = {
  "label": "QuestionAttempt",
  "model": "qa",
  "description": "Question attempts (core analytic primitive)",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "s",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<s>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "q",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<q>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "u",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<u>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "selectedOptionID",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "record<qo>",
      "assign": true,
      "tags": [],
      "isId": false
    },
    {
      "name": "correct",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": false,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "order",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "startTS",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "answerTS",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "totalTime",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "create_at",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "exams",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<record<exam>>",
      "tags": [],
      "isId": false
    },
    {
      "name": "examsTerms",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<object>",
      "tags": [],
      "isId": false
    },
    {
      "name": "categories",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<{ id: record<exam>, categories: record<qt>[] }>",
      "tags": [],
      "isId": false
    },
    {
      "name": "categoryIds",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array<record<qt>>",
      "tags": [],
      "isId": false
    },
    {
      "name": "_reconciliationKey",
      "required": false,
      "nullable": false,
      "ignorePayload": true,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawRelations": "u->UserAttempts->qa { cardinality: many, storeOnModel: true, payloadField: u, processor: functions }\nq->QuestionAttempts->qa { cardinality: many, storeOnModel: true, payloadField: q, processor: functions }\ns->SessionAttempts->qa { cardinality: many, storeOnModel: true, payloadField: s, processor: functions }\nexam->ExamAttempts->qa { cardinality: many, storeOnModel: true, payloadField: exams, processor: functions }\nqt->CategoryAttempts->qa { cardinality: many, storeOnModel: true, payloadField: categoryIds, processor: functions }"
  },
  "edges": [],
  "subTables": []
} as const;

export const faq = {
  "label": "FAQ",
  "model": "faq",
  "description": "Primary FAQ entity representing a single FAQ",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "question",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "answer",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "category",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "faqCategorys",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array",
      "tags": [],
      "isId": false
    },
    {
      "name": "instances",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[id, question, answer, category, instances](\npost: PID, [status, createdAt, updatedAt], {}, <{\nid: string,\nstatus: enum<\"publish\" | \"draft\">,\ncreatedAt: string,\nupdatedAt: string\n}>\n)\nPublic[id, question, answer, category, instances]",
    "rawTypesense": "faq::fn[id, question, answer, category](\ninstances: $instances, <array<string>> <facet>\npost: PID, [status, createdAt, updatedAt], {}, <{\nid: string,\nstatus: enum<\"publish\" | \"draft\">,\ncreatedAt: string,\nupdatedAt: string\n}>\n) {\nsortableFields: [question],\ndefaultSortingField: question,\nqueryBy: [\"question\", \"answer\", \"category\"],\nqueryByWeights: [1, 1, 1],\nfilters: [instances]\n}",
    "rawTaxonomies": "Category/Categories, faqCategory | FAQ categories",
    "instance": true,
    "post": true
  },
  "edges": [],
  "subTables": []
} as const;

export const testimonial = {
  "label": "Testimonial",
  "model": "testimonial",
  "description": "Customer testimonials and quotes",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "name",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "role",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "organisation",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "quote",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "avatar",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "rating",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "order",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "active",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": true,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "instances",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[id, name, role, organisation, quote, rating, order, active, instances](\npost: PID, [status, createdAt, updatedAt], {}, <{\nid: string,\nstatus: enum<\"publish\" | \"draft\">,\ncreatedAt: string,\nupdatedAt: string\n}>\n)\nPublic[id, name, role, organisation, quote, rating, order, active, instances]",
    "rawTypesense": "testimonial::fn[id, name, role, organisation, quote, rating, order](\ninstances: $instances, <array<string>> <facet>\npost: PID, [status, createdAt, updatedAt], {}, <{\nid: string,\nstatus: enum<\"publish\" | \"draft\">,\ncreatedAt: string,\nupdatedAt: string\n}>\n) {\ndefaultSortingField: order,\nqueryBy: [\"name\", \"quote\", \"organisation\"],\nqueryByWeights: [2, 2, 1],\nsortableFields: [order, name],\nfilters: [instances]\n}",
    "instance": true,
    "post": true
  },
  "edges": [],
  "subTables": []
} as const;

export const announcement = {
  "label": "Announcement",
  "model": "announcement",
  "description": "Time-bound announcements shown across instances",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "title",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "message",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "style",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "banner",
      "type": "enum<\"banner\" | \"flyout\" | \"modal\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "severity",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "info",
      "type": "enum<\"info\" | \"success\" | \"warning\" | \"danger\">",
      "tags": [],
      "isId": false
    },
    {
      "name": "dismissible",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": true,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "startsAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "endsAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "active",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": true,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "instances",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[id, title, message, style, severity, dismissible, startsAt, endsAt, active, instances](\npost: PID, [status, createdAt, updatedAt], {}, <{\nid: string,\nstatus: enum<\"publish\" | \"draft\">,\ncreatedAt: string,\nupdatedAt: string\n}>\n)\nPublic[id, title, message, style, severity, dismissible, startsAt, endsAt, active, instances]",
    "rawTypesense": "announcement::fn[id, title, message, style, severity, active](\ninstances: $instances, <array<string>> <facet>\npost: PID, [status, createdAt, updatedAt], {}, <{\nid: string,\nstatus: enum<\"publish\" | \"draft\">,\ncreatedAt: string,\nupdatedAt: string\n}>\n) {\ndefaultSortingField: title,\nqueryBy: [\"title\", \"message\"],\nqueryByWeights: [2, 1],\nsortableFields: [title, active],\nfilters: [instances]\n}",
    "instance": true,
    "post": true
  },
  "edges": [],
  "subTables": []
} as const;

export const notification = {
  "label": "Notification",
  "model": "notification",
  "description": "Dashboard notifications and updates",
  "fields": [
    {
      "name": "id",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "default",
      "type": "string",
      "tags": [],
      "isId": true,
      "idKind": "default"
    },
    {
      "name": "title",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "summary",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "body",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "image",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "ctaLabel",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "ctaUrl",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "string",
      "tags": [],
      "isId": false
    },
    {
      "name": "publishAt",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": "",
      "type": "datetime",
      "tags": [],
      "isId": false
    },
    {
      "name": "order",
      "required": false,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": 0,
      "type": "number",
      "tags": [],
      "isId": false
    },
    {
      "name": "active",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": true,
      "type": "boolean",
      "tags": [],
      "isId": false
    },
    {
      "name": "instances",
      "required": true,
      "nullable": false,
      "ignorePayload": false,
      "defaultValue": [],
      "type": "array",
      "tags": [],
      "isId": false
    }
  ],
  "caps": {
    "crud": "CUD",
    "router": {},
    "rawViews": "Admin[id, title, summary, body, image, ctaLabel, ctaUrl, publishAt, order, active, instances](\npost: PID, [status, createdAt, updatedAt], {}, <{\nid: string,\nstatus: enum<\"publish\" | \"draft\">,\ncreatedAt: string,\nupdatedAt: string\n}>\n)\nPublic[id, title, summary, body, image, ctaLabel, ctaUrl, publishAt, order, active, instances]",
    "rawTypesense": "notification::fn[id, title, summary, body, publishAt, order, active](\ninstances: $instances, <array<string>> <facet>\npost: PID, [status, createdAt, updatedAt], {}, <{\nid: string,\nstatus: enum<\"publish\" | \"draft\">,\ncreatedAt: string,\nupdatedAt: string\n}>\n) {\ndefaultSortingField: publishAt,\nqueryBy: [\"title\", \"summary\", \"body\"],\nqueryByWeights: [2, 1, 1],\nsortableFields: [publishAt, order],\nfilters: [instances]\n}",
    "instance": true,
    "post": true
  },
  "edges": [],
  "subTables": []
} as const;
