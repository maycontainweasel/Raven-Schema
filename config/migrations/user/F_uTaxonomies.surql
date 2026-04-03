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