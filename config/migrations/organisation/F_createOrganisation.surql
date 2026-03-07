DEFINE FUNCTION OVERWRITE fn::createOrganisation($payload: object) {

	if !$payload {
		throw "createOrganisation | payload is required";
	};

	if $payload.title = NONE || $payload.title = null || (type::is_string($payload.title) && string::len($payload.title) = 0) {
		throw "createOrganisation | requires title";
	};
	if $payload.slug = NONE || $payload.slug = null || (type::is_string($payload.slug) && string::len($payload.slug) = 0) {
		throw "createOrganisation | requires slug";
	};
	if $payload.active = NONE || $payload.active = null || (type::is_string($payload.active) && string::len($payload.active) = 0) {
		throw "createOrganisation | requires active";
	};

	let $defaultData = {
		title: "",
		slug: "",
		description: "",
		website: "",
		email: "",
		phone: "",
		industry: "",
		size: "",
		logo: "",
		address: {
			line1: "",
			line2: "",
			city: "",
			region: "",
			postcode: "",
			country: "",
		},
		instances: [],
		active: true,
		createdAt: time::now(),
		updatedAt: time::now(),
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	if !type::is_array($payload.instances){
		throw "createOrganisation | requires valid instances array";
	};

	let $rid = type::record('organisation', $payload.slug);
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
		throw "createOrganisation | failed to create organisation";
	};

	return if $record {
		return $record;
	} else {
		throw "createOrganisation | failed to create organisation";
	}

};

