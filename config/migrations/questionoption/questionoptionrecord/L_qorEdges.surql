DEFINE TABLE OVERWRITE QuestionOptionRecord SCHEMAFULL TYPE RELATION IN qOption OUT qor;
DEFINE FIELD OVERWRITE in ON TABLE QuestionOptionRecord TYPE record<qOption>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionOptionRecord TYPE record<qor>;
DEFINE INDEX OVERWRITE QuestionOptionRecord_unique ON TABLE QuestionOptionRecord FIELDS in, out UNIQUE;
