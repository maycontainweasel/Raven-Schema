DEFINE TABLE OVERWRITE OrganisationUsers SCHEMAFULL TYPE RELATION IN organisation OUT u;
DEFINE FIELD OVERWRITE in ON TABLE OrganisationUsers TYPE record<organisation>;
DEFINE FIELD OVERWRITE out ON TABLE OrganisationUsers TYPE record<u>;
DEFINE INDEX OVERWRITE OrganisationUsers_unique ON TABLE OrganisationUsers FIELDS in, out UNIQUE;
