DEFINE TABLE OVERWRITE SessionPerformanceRecord SCHEMAFULL TYPE RELATION IN s OUT spr;
DEFINE FIELD OVERWRITE in ON TABLE SessionPerformanceRecord TYPE record<s>;
DEFINE FIELD OVERWRITE out ON TABLE SessionPerformanceRecord TYPE record<spr>;
DEFINE INDEX OVERWRITE SessionPerformanceRecord_unique ON TABLE SessionPerformanceRecord FIELDS in, out UNIQUE;
