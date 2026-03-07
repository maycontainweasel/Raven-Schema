DEFINE FUNCTION OVERWRITE fn::createNotification($payload: object) {

	if !$payload {
		throw "createNotification | payload is required";
	};

	if $payload.title = NONE || $payload.title = null || (type::is_string($payload.title) && string::len($payload.title) = 0) {
		throw "createNotification | requires title";
	};
	if $payload.body = NONE || $payload.body = null || (type::is_string($payload.body) && string::len($payload.body) = 0) {
		throw "createNotification | requires body";
	};
	if $payload.active = NONE || $payload.active = null || (type::is_string($payload.active) && string::len($payload.active) = 0) {
		throw "createNotification | requires active";
	};

	let $defaultData = {
		title: "",
		summary: "",
		body: "",
		image: "",
		ctaLabel: "",
		ctaUrl: "",
		publishAt: "",
		order: 0,
		active: true,
		instances: [],
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	if !type::is_array($payload.instances){
		throw "createNotification | requires valid instances array";
	};

	let $record = upsert notification content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createNotification | failed to create notification";
	};

	return if $record {
		return $record;
	} else {
		throw "createNotification | failed to create notification";
	}

};

