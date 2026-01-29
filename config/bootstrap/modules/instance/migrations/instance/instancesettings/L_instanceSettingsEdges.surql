DEFINE TABLE OVERWRITE InstanceSettings SCHEMAFULL TYPE RELATION IN instance OUT instanceSettings;
DEFINE FIELD OVERWRITE in ON TABLE InstanceSettings TYPE record<instance>;
DEFINE FIELD OVERWRITE out ON TABLE InstanceSettings TYPE record<instanceSettings>;
DEFINE INDEX OVERWRITE InstanceSettings_unique ON TABLE InstanceSettings FIELDS in, out UNIQUE;
