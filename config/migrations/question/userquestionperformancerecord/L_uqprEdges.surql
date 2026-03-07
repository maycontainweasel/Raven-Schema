DEFINE TABLE OVERWRITE UserQuestionPerformanceRecord SCHEMAFULL TYPE RELATION IN q OUT uqpr;
DEFINE FIELD OVERWRITE in ON TABLE UserQuestionPerformanceRecord TYPE record<q>;
DEFINE FIELD OVERWRITE out ON TABLE UserQuestionPerformanceRecord TYPE record<uqpr>;
DEFINE INDEX OVERWRITE UserQuestionPerformanceRecord_unique ON TABLE UserQuestionPerformanceRecord FIELDS in, out UNIQUE;
