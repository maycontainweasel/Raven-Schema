DEFINE TABLE IF NOT EXISTS faq TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE FAQAdmin TYPE NORMAL AS
SELECT
    id,
    question,
    answer,
    category,
    instances,
    (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post
FROM faq;
