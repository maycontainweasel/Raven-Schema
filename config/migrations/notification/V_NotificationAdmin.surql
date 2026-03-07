DEFINE TABLE IF NOT EXISTS notification TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE NotificationAdmin TYPE NORMAL AS
SELECT
    id,
    title,
    summary,
    body,
    image,
    ctaLabel,
    ctaUrl,
    publishAt,
    order,
    active,
    instances,
    (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post
FROM notification;
