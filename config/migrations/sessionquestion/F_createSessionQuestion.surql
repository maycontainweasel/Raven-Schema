DEFINE FUNCTION OVERWRITE fn::createSessionQuestion($payload: object) {

	if !$payload {
		throw "createSessionQuestion | payload is required";
	};

	let $payload = fn::objectRemove($payload, ["startTS", "answerTS", "lastUpdated"]);

	if $payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len($payload.s) = 0) {
		throw "createSessionQuestion | requires s";
	};
	if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len($payload.q) = 0) {
		throw "createSessionQuestion | requires q";
	};
	if $payload.order = NONE || $payload.order = null || (type::is_string($payload.order) && string::len($payload.order) = 0) {
		throw "createSessionQuestion | requires order";
	};

	let $defaultData = {
		s: "",
		q: "",
		order: 0,
		flagged: false,
		complete: false,
		startTS: "",
		answerTS: "",
		totalTime: 0,
		lastUpdated: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		s: if $payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0) { null } else { fn::ridParam("s", $payload.s) },
		q: if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { null } else { fn::ridParam("q", $payload.q) },
	});

	let $payload = fn::objectAssign($payload, {
		s: if type::is_array($payload.s) { $payload.s } else if $payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0) { $payload.s } else { fn::ridParam("s", $payload.s) },
		q: if type::is_array($payload.q) { $payload.q } else if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { $payload.q } else { fn::ridParam("q", $payload.q) },
	});

	if !($payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0)) && (!type::is_record($payload.s) || !record::exists($payload.s)) {
		throw "createSessionQuestion | s must reference an existing s record";
	};
	if !($payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0)) && (!type::is_record($payload.q) || !record::exists($payload.q)) {
		throw "createSessionQuestion | q must reference an existing q record";
	};

	let $record = upsert SessionQuestions content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createSessionQuestion | failed to create SessionQuestions";
	};

	return if $record {
		return $record;
	} else {
		throw "createSessionQuestion | failed to create SessionQuestions";
	}

};

