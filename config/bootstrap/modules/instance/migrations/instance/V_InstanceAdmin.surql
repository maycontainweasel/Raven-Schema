DEFINE TABLE IF NOT EXISTS instance TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE InstanceAdmin TYPE NORMAL AS
SELECT
    id,
    key,
    instance,
    title,
    status,
    active,
    (select * from only type::record('instanceSettings', record::id($this.id))) AS settings
FROM instance;
