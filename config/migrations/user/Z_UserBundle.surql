-- ========================================
-- Table Bundle: User
-- ========================================

-- ---------- FUNCTIONS ----------

-- File: F_createUser.surql
DEFINE FUNCTION OVERWRITE fn::createUser($payload: object) {

	if !$payload {
		throw "createUser | payload is required";
	};

	if $payload.email = NONE || $payload.email = null || (type::is_string($payload.email) && string::len($payload.email) = 0) {
		throw "createUser | requires email";
	};
	if $payload.firstName = NONE || $payload.firstName = null || (type::is_string($payload.firstName) && string::len($payload.firstName) = 0) {
		throw "createUser | requires firstName";
	};
	if $payload.surname = NONE || $payload.surname = null || (type::is_string($payload.surname) && string::len($payload.surname) = 0) {
		throw "createUser | requires surname";
	};
	if $payload.role = NONE || $payload.role = null || (type::is_string($payload.role) && string::len($payload.role) = 0) {
		throw "createUser | requires role";
	};

	if !($payload.role || $payload.roles) {
		throw "createUser | requires role";
	};


	let $defaultData = {
		email: "",
		uniqueId: "",
		firstName: "",
		surname: "",
		role: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		uniqueId: crypto::md5($payload.email),
	});

	let $payload = fn::objectAssign($payload, {
		role: if type::is_array($payload.role) { $payload.role } else if $payload.role = NONE || $payload.role = null || (type::is_string($payload.role) && string::len(string::trim($payload.role)) = 0) { $payload.role } else { fn::ridParam("t_u_role", $payload.role) },
	});

	if !($payload.role = NONE || $payload.role = null || (type::is_string($payload.role) && string::len(string::trim($payload.role)) = 0)) && (!type::is_record($payload.role) || !record::exists($payload.role)) {
		throw "createUser | role must reference an existing t_u_role record";
	};

	let $tax_role = if type::is_array($payload.role) || $payload.role {
		$payload.role
	} else if type::is_array($payload.roles) || $payload.roles {
		$payload.roles
	} else {
		null
	};

	let $payload = fn::objectRemove($payload, ["roles"]);

	let $tax_role_list = if type::is_array($tax_role) {
		$tax_role
	} else if $tax_role {
		[$tax_role]
	} else {
		[]
	};
	let $tax_role_norm = array::map($tax_role_list, |$term| {
		if type::is_record($term) {
			type::record("t_u_role", record::id($term))
		} else {
			let $termPayload = { key: $term };
			type::record('t_u_role', $termPayload.key)
		};
	});
	let $payload = fn::objectAssign($payload, {
		role: if array::len($tax_role_norm) > 0 { array::first($tax_role_norm) } else { $payload.role }
	});


	let $rid = type::record('u', $payload.email);
	let $payload = fn::objectRemove($payload, ["id"]);
	let $record = upsert $rid content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $record = if $record { $record } else {
		let $fallback = select * from only $rid;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createUser | failed to create u";
	};

	if array::len($tax_role_norm) > 0 {
		fn::attachTerm("u", "role", $recordID, array::first($tax_role_norm), { skipExists: true });
	};


	return if $record {
		return $record;
	} else {
		throw "createUser | failed to create u";
	}

};

-- File: F_deleteUser.surql
DEFINE FUNCTION OVERWRITE fn::deleteUser($UserID: any) {

	let $rid = fn::ridParam("u", $UserID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from Post where out = $rid;
	let $PID = fn::PID($rid);
	if type::is_record($PID) && record::exists($PID) {
		fn::deletePost($PID);
	};
	delete from UserRoles where in = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteUser | failed to delete User";
	}

};

-- File: F_uTaxonomies.surql
DEFINE FUNCTION OVERWRITE fn::createUserRoleTaxonomy($payload: option<object>) {

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else {
		{}
	};

	let $defaultData = {
		key: "role",
		label: "Role",
		labelPlural: "Roles",
		permalink: "role",
		description: "User roles",
		hierarchical: false,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	if !$payload.permalink || $payload.permalink == "" {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.key) });
	} else {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.permalink) });
	};

	let $RID = type::record('tax', fn::stringID(["u", "role"]));
	let $record = upsert $RID merge $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $registryPayload = {
		key: "role",
		labels: { singular: "Role", plural: "Roles" },
		model: "u",
		taxonomyModel: "tax",
		termModel: "t_u_role",
		taxonomyRid: $RID,
		taxonomyIdSpec: "stringID<u, role>",
		termIdSpec: "<field:key>",
		edgeRecordToTerm: "UserRoles",
		edgeTaxonomyToTerm: "UserRolesTerms",
		cardinality: "one",
		storeOnModel: true,
		createOnAttach: true,
		generateNamedFunctions: false,
		payloadField: "role",
		payloadAliases: ["roles"],
		required: true,
		processor: "functions",
		hierarchical: false,
		taxonomyDefaults: {
  key: "role",
  label: "Role",
  labelPlural: "Roles",
  permalink: "role",
  description: "User roles",
  hierarchical: false,
},
		termDefaults: {
  key: "",
  label: "",
  permalink: "",
  description: "",
  parent: "",
},
	};

	let $APP_ID = type::record("app", "taxonomies");
	let $app = (select * from $APP_ID)[0] ?? {};
	let $modelEntry = $app["u"] ?? {};
	let $taxMap = $modelEntry.taxonomies ?? {};
	let $taxMap = fn::objectAssign($taxMap, { "role": $registryPayload });
	let $modelEntry = fn::objectAssign($modelEntry, { taxonomies: $taxMap });
	upsert $APP_ID set u = $modelEntry;

	return $record;

};

-- File: F_updateUser.surql
DEFINE FUNCTION OVERWRITE fn::updateUser($UserID: any, $payload: object) {

	let $rid = fn::ridParam("u", $UserID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateUser | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		role: if $payload.role = NONE { $current.role } else if type::is_array($payload.role) { $payload.role } else if $payload.role = null || (type::is_string($payload.role) && string::len(string::trim($payload.role)) = 0) { $payload.role } else { fn::ridParam("t_u_role", $payload.role) },
	});

	if !($payload.role = NONE || $payload.role = null || (type::is_string($payload.role) && string::len(string::trim($payload.role)) = 0)) && (!type::is_record($payload.role) || !record::exists($payload.role)) {
		throw "updateUser | role must reference an existing t_u_role record";
	};

	let $tax_role = if type::is_array($payload.role) || $payload.role {
		$payload.role
	} else if type::is_array($payload.roles) || $payload.roles {
		$payload.roles
	} else {
		null
	};

	let $payload = fn::objectRemove($payload, ["roles"]);

	let $tax_role_list = if type::is_array($tax_role) {
		$tax_role
	} else if $tax_role {
		[$tax_role]
	} else {
		[]
	};
	let $tax_role_norm = array::map($tax_role_list, |$term| {
		if type::is_record($term) {
			type::record("t_u_role", record::id($term))
		} else {
			let $termPayload = { key: $term };
			type::record('t_u_role', $termPayload.key)
		};
	});
	let $payload = fn::objectAssign($payload, {
		role: if type::is_array($tax_role) || $tax_role {
			if array::len($tax_role_norm) > 0 { array::first($tax_role_norm) } else { $tax_role }
		} else {
			$payload.role
		}
	});


	let $result = update $rid merge $payload;
	let $result = if type::is_array($result) { array::first($result) } else { $result };

	// --- Refresh Record views
	update $rid merge {
		"touch": 1
	};
	update $rid unset touch;

	let $PID = fn::PID($rid);

	if(type::is_record($PID) && record::exists($PID)) {
		update $PID merge {
			"touch": 1
		};
		update $PID unset touch;
	};
	// --- End Refresh Record views

	if type::is_array($tax_role) {
		delete from UserRoles where in = $rid;
		if array::len($tax_role_norm) > 0 {
			fn::attachTerm("u", "role", $rid, array::first($tax_role_norm), {});
		};
	} else if $tax_role {
		delete from UserRoles where in = $rid;
		if array::len($tax_role_norm) > 0 {
			fn::attachTerm("u", "role", $rid, array::first($tax_role_norm), {});
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateUser | failed to update User";
	}

};


-- ---------- EVENTS ----------

-- File: E_UserPostCreate.surql
DEFINE EVENT OVERWRITE UserPostCreate ON TABLE u WHEN $event = "CREATE" THEN { let $RID = $after.id;
if !type::is_record($RID) { throw "UserPostCreate | invalid record id"; };

fn::createPost({
  id: $RID,
  title: record::id($RID)
});
fn::attachRecordToPost($RID, { skipExists: true });
let $PID = fn::PID($RID);

if($after.status == 'publish') {
  fn::updatePost($PID, {
    "publishedAt": time::now()
  });
} else {
  fn::updatePost($PID, {
    "publishedAt": null
  });
} };

-- File: E_UserPostDelete.surql
DEFINE EVENT OVERWRITE UserPostDelete ON TABLE u WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "UserPostDelete | invalid record id"; };
let $PID = fn::PID($RID);
fn::deleteEdge($PID, "Post", $RID, { boundId: true });
fn::deletePost($PID) };

-- File: E_UserPostUpdate.surql
DEFINE EVENT OVERWRITE UserPostUpdate ON TABLE u WHEN $event = "UPDATE" THEN { let $RID = $after.id;
if !type::is_record($RID) { throw "UserPostUpdate | invalid record id"; };
let $PID = fn::PID($RID);

if($after.status == "publish" and $before.status != "publish") {
  let $time = time::now();
  fn::updatePost($PID, {
    "updatedAt": $time,
    "publishedAt": $time
  });
} else if $after.status != "publish" {
  fn::updatePost($PID, {
    "updatedAt": time::now(),
    "publishedAt": null
  });
} };


-- ---------- VIEWS ----------

-- File: V_UserAdmin.surql
DEFINE TABLE IF NOT EXISTS u TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE UserAdmin TYPE NORMAL AS
SELECT
    id
FROM u;


-- ---------- EDGES ----------

-- File: L_uTaxonomyEdges.surql
DEFINE TABLE OVERWRITE UserRolesTerms SCHEMAFULL TYPE RELATION IN tax OUT t_u_role;
DEFINE FIELD OVERWRITE in ON TABLE UserRolesTerms TYPE record<tax>;
DEFINE FIELD OVERWRITE out ON TABLE UserRolesTerms TYPE record<t_u_role>;
DEFINE INDEX OVERWRITE UserRolesTerms_unique ON TABLE UserRolesTerms FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE UserRoles SCHEMAFULL TYPE RELATION IN u OUT t_u_role;
DEFINE FIELD OVERWRITE in ON TABLE UserRoles TYPE record<u>;
DEFINE FIELD OVERWRITE out ON TABLE UserRoles TYPE record<t_u_role>;
DEFINE INDEX OVERWRITE UserRoles_unique ON TABLE UserRoles FIELDS in, out UNIQUE;


-- ---------- MISCELLANEOUS ----------

-- File: T_uTaxonomyTables.surql
DEFINE TABLE OVERWRITE tax TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE t_u_role TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

