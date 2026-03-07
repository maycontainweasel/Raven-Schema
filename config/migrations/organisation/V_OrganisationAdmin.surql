DEFINE TABLE IF NOT EXISTS organisation TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE OrganisationAdmin TYPE NORMAL AS
SELECT
    id,
    title,
    slug,
    description,
    website,
    email,
    phone,
    industry,
    size,
    logo,
    address,
    instances,
    active,
    createdAt,
    updatedAt
FROM organisation;
