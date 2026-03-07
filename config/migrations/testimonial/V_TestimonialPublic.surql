DEFINE TABLE IF NOT EXISTS testimonial TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE TestimonialPublic TYPE NORMAL AS
SELECT
    id,
    name,
    role,
    organisation,
    quote,
    rating,
    order,
    active,
    instances
FROM testimonial;
