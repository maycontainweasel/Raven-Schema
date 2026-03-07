DEFINE TABLE OVERWRITE QuestionOption SCHEMAFULL TYPE RELATION IN q OUT qOption;
DEFINE FIELD OVERWRITE in ON TABLE QuestionOption TYPE record<q>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionOption TYPE record<qOption>;
DEFINE INDEX OVERWRITE QuestionOption_unique ON TABLE QuestionOption FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE QuestionNote SCHEMAFULL TYPE RELATION IN q OUT qnote;
DEFINE FIELD OVERWRITE in ON TABLE QuestionNote TYPE record<q>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionNote TYPE record<qnote>;
DEFINE INDEX OVERWRITE QuestionNote_unique ON TABLE QuestionNote FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE QuestionPerformanceRecord SCHEMAFULL TYPE RELATION IN q OUT qpr;
DEFINE FIELD OVERWRITE in ON TABLE QuestionPerformanceRecord TYPE record<q>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionPerformanceRecord TYPE record<qpr>;
DEFINE INDEX OVERWRITE QuestionPerformanceRecord_unique ON TABLE QuestionPerformanceRecord FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE UserQuestionNote SCHEMAFULL TYPE RELATION IN q OUT uqnote;
DEFINE FIELD OVERWRITE in ON TABLE UserQuestionNote TYPE record<q>;
DEFINE FIELD OVERWRITE out ON TABLE UserQuestionNote TYPE record<uqnote>;
DEFINE INDEX OVERWRITE UserQuestionNote_unique ON TABLE UserQuestionNote FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE UserQuestionPerformanceRecord SCHEMAFULL TYPE RELATION IN q OUT uqpr;
DEFINE FIELD OVERWRITE in ON TABLE UserQuestionPerformanceRecord TYPE record<q>;
DEFINE FIELD OVERWRITE out ON TABLE UserQuestionPerformanceRecord TYPE record<uqpr>;
DEFINE INDEX OVERWRITE UserQuestionPerformanceRecord_unique ON TABLE UserQuestionPerformanceRecord FIELDS in, out UNIQUE;
