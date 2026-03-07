DEFINE TABLE OVERWRITE SessionCategoryRecord SCHEMAFULL TYPE RELATION IN s OUT scr;
DEFINE FIELD OVERWRITE in ON TABLE SessionCategoryRecord TYPE record<s>;
DEFINE FIELD OVERWRITE out ON TABLE SessionCategoryRecord TYPE record<scr>;
DEFINE INDEX OVERWRITE SessionCategoryRecord_unique ON TABLE SessionCategoryRecord FIELDS in, out UNIQUE;
