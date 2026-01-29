// *****************************************************
// Global - Schema Assets table
// *****************************************************

// Ensure the app table exists for schema asset tracking
DEFINE TABLE IF NOT EXISTS app SCHEMALESS;

// This record is used by this application to track which generated assets are within each of the dbs
upsert only app:schemaAssets;

// Ensure a default local instance exists (safe even if instances aren't used yet)
upsert only instance:local;


// Ensure all taxonomies are registered before seeding terms
fn::initTaxonomies();
