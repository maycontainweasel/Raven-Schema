DEFINE TABLE OVERWRITE QuestionPerformanceRecord SCHEMAFULL TYPE RELATION IN q OUT qpr;
DEFINE FIELD OVERWRITE in ON TABLE QuestionPerformanceRecord TYPE record<q>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionPerformanceRecord TYPE record<qpr>;
DEFINE INDEX OVERWRITE QuestionPerformanceRecord_unique ON TABLE QuestionPerformanceRecord FIELDS in, out UNIQUE;
