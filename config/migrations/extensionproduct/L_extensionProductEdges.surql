DEFINE TABLE OVERWRITE ExtensionVariant SCHEMAFULL TYPE RELATION IN extensionProduct OUT extensionVariant;
DEFINE FIELD OVERWRITE in ON TABLE ExtensionVariant TYPE record<extensionProduct>;
DEFINE FIELD OVERWRITE out ON TABLE ExtensionVariant TYPE record<extensionVariant>;
DEFINE INDEX OVERWRITE ExtensionVariant_unique ON TABLE ExtensionVariant FIELDS in, out UNIQUE;
