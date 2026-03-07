DEFINE FUNCTION OVERWRITE fn::createAnnouncement($payload: object) {

	if !$payload {
		throw "createAnnouncement | payload is required";
	};

	if $payload.title = NONE || $payload.title = null || (type::is_string($payload.title) && string::len($payload.title) = 0) {
		throw "createAnnouncement | requires title";
	};
	if $payload.message = NONE || $payload.message = null || (type::is_string($payload.message) && string::len($payload.message) = 0) {
		throw "createAnnouncement | requires message";
	};
	if $payload.style = NONE || $payload.style = null || (type::is_string($payload.style) && string::len($payload.style) = 0) {
		throw "createAnnouncement | requires style";
	};
	if $payload.severity = NONE || $payload.severity = null || (type::is_string($payload.severity) && string::len($payload.severity) = 0) {
		throw "createAnnouncement | requires severity";
	};
	if $payload.dismissible = NONE || $payload.dismissible = null || (type::is_string($payload.dismissible) && string::len($payload.dismissible) = 0) {
		throw "createAnnouncement | requires dismissible";
	};
	if $payload.active = NONE || $payload.active = null || (type::is_string($payload.active) && string::len($payload.active) = 0) {
		throw "createAnnouncement | requires active";
	};

	if !($payload.style IN ["banner", "flyout", "modal"]) {
		throw "createAnnouncement | invalid style";
	};
	if !($payload.severity IN ["info", "success", "warning", "danger"]) {
		throw "createAnnouncement | invalid severity";
	};

	let $defaultData = {
		title: "",
		message: "",
		style: "banner",
		severity: "info",
		dismissible: true,
		startsAt: "",
		endsAt: "",
		active: true,
		instances: [],
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	if !type::is_array($payload.instances){
		throw "createAnnouncement | requires valid instances array";
	};

	let $record = upsert announcement content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createAnnouncement | failed to create announcement";
	};

	return if $record {
		return $record;
	} else {
		throw "createAnnouncement | failed to create announcement";
	}

};

