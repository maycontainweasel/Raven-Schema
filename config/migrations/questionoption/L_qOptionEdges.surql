DEFINE TABLE OVERWRITE QuestionOption SCHEMAFULL TYPE RELATION IN q OUT qOption;
DEFINE FIELD OVERWRITE in ON TABLE QuestionOption TYPE record<q>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionOption TYPE record<qOption>;
DEFINE INDEX OVERWRITE QuestionOption_unique ON TABLE QuestionOption FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE QuestionOptionRecord SCHEMAFULL TYPE RELATION IN qOption OUT qor;
DEFINE FIELD OVERWRITE in ON TABLE QuestionOptionRecord TYPE record<qOption>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionOptionRecord TYPE record<qor>;
DEFINE INDEX OVERWRITE QuestionOptionRecord_unique ON TABLE QuestionOptionRecord FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE UserQuestionOptionRecord SCHEMAFULL TYPE RELATION IN qOption OUT uqor;
DEFINE FIELD OVERWRITE in ON TABLE UserQuestionOptionRecord TYPE record<qOption>;
DEFINE FIELD OVERWRITE out ON TABLE UserQuestionOptionRecord TYPE record<uqor>;
DEFINE INDEX OVERWRITE UserQuestionOptionRecord_unique ON TABLE UserQuestionOptionRecord FIELDS in, out UNIQUE;
