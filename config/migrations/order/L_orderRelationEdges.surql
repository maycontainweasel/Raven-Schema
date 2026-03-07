DEFINE TABLE OVERWRITE OrderProduct SCHEMAFULL TYPE RELATION IN order OUT product;
DEFINE FIELD OVERWRITE in ON TABLE OrderProduct TYPE record<order>;
DEFINE FIELD OVERWRITE out ON TABLE OrderProduct TYPE record<product>;
DEFINE INDEX OVERWRITE OrderProduct_unique ON TABLE OrderProduct FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE OrderProductVariant SCHEMAFULL TYPE RELATION IN order OUT productVariant;
DEFINE FIELD OVERWRITE in ON TABLE OrderProductVariant TYPE record<order>;
DEFINE FIELD OVERWRITE out ON TABLE OrderProductVariant TYPE record<productVariant>;
DEFINE INDEX OVERWRITE OrderProductVariant_unique ON TABLE OrderProductVariant FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE OrderExtensionProduct SCHEMAFULL TYPE RELATION IN order OUT extensionProduct;
DEFINE FIELD OVERWRITE in ON TABLE OrderExtensionProduct TYPE record<order>;
DEFINE FIELD OVERWRITE out ON TABLE OrderExtensionProduct TYPE record<extensionProduct>;
DEFINE INDEX OVERWRITE OrderExtensionProduct_unique ON TABLE OrderExtensionProduct FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE OrderExtensionVariant SCHEMAFULL TYPE RELATION IN order OUT extensionVariant;
DEFINE FIELD OVERWRITE in ON TABLE OrderExtensionVariant TYPE record<order>;
DEFINE FIELD OVERWRITE out ON TABLE OrderExtensionVariant TYPE record<extensionVariant>;
DEFINE INDEX OVERWRITE OrderExtensionVariant_unique ON TABLE OrderExtensionVariant FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE OrderTrialProduct SCHEMAFULL TYPE RELATION IN order OUT product;
DEFINE FIELD OVERWRITE in ON TABLE OrderTrialProduct TYPE record<order>;
DEFINE FIELD OVERWRITE out ON TABLE OrderTrialProduct TYPE record<product>;
DEFINE INDEX OVERWRITE OrderTrialProduct_unique ON TABLE OrderTrialProduct FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE ProductOrders SCHEMAFULL TYPE RELATION IN order OUT product;
DEFINE FIELD OVERWRITE in ON TABLE ProductOrders TYPE record<order>;
DEFINE FIELD OVERWRITE out ON TABLE ProductOrders TYPE record<product>;
DEFINE INDEX OVERWRITE ProductOrders_unique ON TABLE ProductOrders FIELDS in, out UNIQUE;
