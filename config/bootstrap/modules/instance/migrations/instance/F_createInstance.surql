DEFINE FUNCTION OVERWRITE fn::createInstance($payload: object) {

	if !$payload {
		throw "createInstance | payload is required";
	};

	if !$payload.key {
		throw "createInstance | requires key";
	};
	if !$payload.title {
		throw "createInstance | requires title";
	};

	let $defaultData = {
		key: "",
		instance: $payload.key,
		title: "",
		status: "active",
		active: true,
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $rid = type::record('instance', $payload.key);
	let $payload = fn::objectRemove($payload, ["id"]);
	let $record = upsert $rid content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	return if $record {
		return $record;
	} else {
		throw "createInstance | failed to create instance";
	}

};

