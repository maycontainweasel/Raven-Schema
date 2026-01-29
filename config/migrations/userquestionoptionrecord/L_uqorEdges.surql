DEFINE TABLE OVERWRITE UserQuestionOptionRecord SCHEMAFULL TYPE RELATION IN qOption OUT uqor;
DEFINE FIELD OVERWRITE in ON TABLE UserQuestionOptionRecord TYPE record<qOption>;
DEFINE FIELD OVERWRITE out ON TABLE UserQuestionOptionRecord TYPE record<uqor>;
DEFINE INDEX OVERWRITE UserQuestionOptionRecord_unique ON TABLE UserQuestionOptionRecord FIELDS in, out UNIQUE;
