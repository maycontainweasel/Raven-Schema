// *****************************************************
// Global - Schema Assets table
// *****************************************************

// Ensure the app table exists for schema asset tracking
DEFINE TABLE IF NOT EXISTS app SCHEMALESS;

// These should be generated but they're not being included fro some reason.
DEFINE TABLE OVERWRITE tax TYPE NORMAL SCHEMALESS PERMISSIONS FULL;
DEFINE TABLE OVERWRITE t_u_role TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

// This record is used by this application to track which generated assets are within each of the dbs
upsert only app:schemaAssets;

// Ensure a default local instance exists (safe even if instances aren't used yet)
upsert only instance:local;


// Ensure all taxonomies are registered before seeding terms
fn::initTaxonomies();
