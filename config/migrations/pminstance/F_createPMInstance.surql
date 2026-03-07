DEFINE FUNCTION OVERWRITE fn::createPMInstance($payload: object) {

	if !$payload {
		throw "createPMInstance | payload is required";
	};

	if $payload.key = NONE || $payload.key = null || (type::is_string($payload.key) && string::len($payload.key) = 0) {
		throw "createPMInstance | requires key";
	};
	if $payload.instance = NONE || $payload.instance = null || (type::is_string($payload.instance) && string::len($payload.instance) = 0) {
		throw "createPMInstance | requires instance";
	};
	if $payload.title = NONE || $payload.title = null || (type::is_string($payload.title) && string::len($payload.title) = 0) {
		throw "createPMInstance | requires title";
	};
	if $payload.status = NONE || $payload.status = null || (type::is_string($payload.status) && string::len($payload.status) = 0) {
		throw "createPMInstance | requires status";
	};

	if !($payload.status IN ["active", "inactive", "maintenance"]) {
		throw "createPMInstance | invalid status";
	};

	let $defaultData = {
		key: "",
		instance: "",
		title: "",
		status: "active",
		flag: "",
		description: "",
		domains: [],
		primaryDomain: "",
		locale: "en-GB",
		timezone: "Europe/London",
		currency: "GBP",
		currencies: [],
		pricingOptions: [],
		apiKeys: {},
		surrealdb: {
			url: "",
			namespace: "",
			database: "",
			user: "",
			pass: "",
		},
		redis: {
			host: "",
			port: 0,
			password: "",
			database: 0,
		},
		content: {},
		createdAt: time::now(),
		updatedAt: time::now(),
		createdBy: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		instance: if $payload.instance = NONE || $payload.instance = null || (type::is_string($payload.instance) && string::len(string::trim($payload.instance)) = 0) { null } else { fn::ridParam("instance", $payload.instance) },
	});

	let $payload = fn::objectAssign($payload, {
		instance: if type::is_array($payload.instance) { $payload.instance } else if $payload.instance = NONE || $payload.instance = null || (type::is_string($payload.instance) && string::len(string::trim($payload.instance)) = 0) { $payload.instance } else { fn::ridParam("instance", $payload.instance) },
	});

	if !($payload.instance = NONE || $payload.instance = null || (type::is_string($payload.instance) && string::len(string::trim($payload.instance)) = 0)) && (!type::is_record($payload.instance) || !record::exists($payload.instance)) {
		throw "createPMInstance | instance must reference an existing instance record";
	};

	let $rid = type::record('pmInstance', $payload.key);
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
		throw "createPMInstance | failed to create pmInstance";
	};

	return if $record {
		return $record;
	} else {
		throw "createPMInstance | failed to create pmInstance";
	}

};

