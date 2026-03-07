DEFINE TABLE OVERWRITE ExtensionVariants SCHEMAFULL TYPE RELATION IN extensionProduct OUT extensionVariant;
DEFINE FIELD OVERWRITE in ON TABLE ExtensionVariants TYPE record<extensionProduct>;
DEFINE FIELD OVERWRITE out ON TABLE ExtensionVariants TYPE record<extensionVariant>;
DEFINE INDEX OVERWRITE ExtensionVariants_unique ON TABLE ExtensionVariants FIELDS in, out UNIQUE;
