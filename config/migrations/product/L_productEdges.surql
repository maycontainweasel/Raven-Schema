DEFINE TABLE OVERWRITE ProductVariant SCHEMAFULL TYPE RELATION IN product OUT productVariant;
DEFINE FIELD OVERWRITE in ON TABLE ProductVariant TYPE record<product>;
DEFINE FIELD OVERWRITE out ON TABLE ProductVariant TYPE record<productVariant>;
DEFINE INDEX OVERWRITE ProductVariant_unique ON TABLE ProductVariant FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE ProductVariants SCHEMAFULL TYPE RELATION IN product OUT productVariant;
DEFINE FIELD OVERWRITE in ON TABLE ProductVariants TYPE record<product>;
DEFINE FIELD OVERWRITE out ON TABLE ProductVariants TYPE record<productVariant>;
DEFINE INDEX OVERWRITE ProductVariants_unique ON TABLE ProductVariants FIELDS in, out UNIQUE;
