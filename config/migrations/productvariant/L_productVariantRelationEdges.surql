DEFINE TABLE OVERWRITE VariantExtensionProduct SCHEMAFULL TYPE RELATION IN productVariant OUT extensionProduct;
DEFINE FIELD OVERWRITE in ON TABLE VariantExtensionProduct TYPE record<productVariant>;
DEFINE FIELD OVERWRITE out ON TABLE VariantExtensionProduct TYPE record<extensionProduct>;
DEFINE INDEX OVERWRITE VariantExtensionProduct_unique ON TABLE VariantExtensionProduct FIELDS in, out UNIQUE;
