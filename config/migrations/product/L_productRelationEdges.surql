DEFINE TABLE OVERWRITE ProductExams SCHEMAFULL TYPE RELATION IN product OUT exam;
DEFINE FIELD OVERWRITE in ON TABLE ProductExams TYPE record<product>;
DEFINE FIELD OVERWRITE out ON TABLE ProductExams TYPE record<exam>;
DEFINE INDEX OVERWRITE ProductExams_unique ON TABLE ProductExams FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE ProductVariants SCHEMAFULL TYPE RELATION IN product OUT productVariant;
DEFINE FIELD OVERWRITE in ON TABLE ProductVariants TYPE record<product>;
DEFINE FIELD OVERWRITE out ON TABLE ProductVariants TYPE record<productVariant>;
DEFINE INDEX OVERWRITE ProductVariants_unique ON TABLE ProductVariants FIELDS in, out UNIQUE;
