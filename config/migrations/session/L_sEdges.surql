DEFINE TABLE OVERWRITE SessionCategoryRecord SCHEMAFULL TYPE RELATION IN s OUT scr;
DEFINE FIELD OVERWRITE in ON TABLE SessionCategoryRecord TYPE record<s>;
DEFINE FIELD OVERWRITE out ON TABLE SessionCategoryRecord TYPE record<scr>;
DEFINE INDEX OVERWRITE SessionCategoryRecord_unique ON TABLE SessionCategoryRecord FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE SessionEvent SCHEMAFULL TYPE RELATION IN s OUT se;
DEFINE FIELD OVERWRITE in ON TABLE SessionEvent TYPE record<s>;
DEFINE FIELD OVERWRITE out ON TABLE SessionEvent TYPE record<se>;
DEFINE INDEX OVERWRITE SessionEvent_unique ON TABLE SessionEvent FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE SessionPerformanceRecord SCHEMAFULL TYPE RELATION IN s OUT spr;
DEFINE FIELD OVERWRITE in ON TABLE SessionPerformanceRecord TYPE record<s>;
DEFINE FIELD OVERWRITE out ON TABLE SessionPerformanceRecord TYPE record<spr>;
DEFINE INDEX OVERWRITE SessionPerformanceRecord_unique ON TABLE SessionPerformanceRecord FIELDS in, out UNIQUE;
