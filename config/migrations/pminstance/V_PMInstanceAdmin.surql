DEFINE TABLE IF NOT EXISTS pmInstance TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE PMInstanceAdmin TYPE NORMAL AS
SELECT
    id,
    key,
    instance,
    title,
    status,
    flag,
    description,
    domains,
    primaryDomain,
    locale,
    timezone,
    currency,
    currencies,
    pricingOptions,
    apiKeys,
    surrealdb,
    redis,
    content,
    createdAt,
    updatedAt,
    createdBy
FROM pmInstance;
