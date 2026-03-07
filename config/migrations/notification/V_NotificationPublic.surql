DEFINE TABLE IF NOT EXISTS notification TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE NotificationPublic TYPE NORMAL AS
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
    instances
FROM notification;
