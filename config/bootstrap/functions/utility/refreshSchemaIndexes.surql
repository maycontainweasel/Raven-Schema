DEFINE FUNCTION OVERWRITE fn::schemaIndexRegistry() {
	return [
		{ table: "Post", name: "Post_unique" },
		{ table: "UserRoles", name: "UserRoles_unique" },
		{ table: "UserRolesTerms", name: "UserRolesTerms_unique" },
	];
};

DEFINE FUNCTION OVERWRITE fn::refreshSchemaIndexes() {
	let $indexes = fn::schemaIndexRegistry();
	let $indexes = if type::is_array($indexes) { $indexes } else { [] };

	UPSERT app:indexes CONTENT {
		updatedAt: time::now(),
		indexes: $indexes
	};

	REBUILD INDEX IF EXISTS Post_unique ON TABLE Post;
	REBUILD INDEX IF EXISTS UserRoles_unique ON TABLE UserRoles;
	REBUILD INDEX IF EXISTS UserRolesTerms_unique ON TABLE UserRolesTerms;

	return $indexes;
};
