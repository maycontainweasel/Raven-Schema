DEFINE FUNCTION OVERWRITE fn::createUserQuestionNote($PARENT_ID: any, $payload: option<object>) {

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else if type::is_object($PARENT_ID) && !type::is_record($PARENT_ID) {
		$PARENT_ID
	} else {
		{}
	};

	let $parentInput = if type::is_record($PARENT_ID) {
		$PARENT_ID
	} else if !type::is_object($PARENT_ID) && $PARENT_ID != NONE && $PARENT_ID != null && (!type::is_string($PARENT_ID) || string::len($PARENT_ID) > 0) {
		$PARENT_ID
	} else {
		$payloadInput.q
	};

	let $PARENT_ID = fn::ridParam("q", $parentInput);
	if !type::is_record($PARENT_ID) {
		throw "createUserQuestionNote | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createUserQuestionNote | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	if $payloadInput.u = NONE || $payloadInput.u = null || (type::is_string($payloadInput.u) && string::len($payloadInput.u) = 0) {
		throw "createUserQuestionNote | requires u";
	};
	if $payloadInput.q = NONE || $payloadInput.q = null || (type::is_string($payloadInput.q) && string::len($payloadInput.q) = 0) {
		throw "createUserQuestionNote | requires q";
	};

	let $defaultData = {
		u: "",
		q: "",
		note: "",
		order: 0,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $payload = fn::objectAssign($payload, {
		u: if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { null } else { fn::ridParam("u", $payload.u) },
		q: if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { null } else { fn::ridParam("q", $payload.q) },
	});

	let $payload = fn::objectAssign($payload, {
		u: if type::is_array($payload.u) { $payload.u } else if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { $payload.u } else { fn::ridParam("u", $payload.u) },
		q: if type::is_array($payload.q) { $payload.q } else if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { $payload.q } else { fn::ridParam("q", $payload.q) },
	});

	if !($payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0)) && (!type::is_record($payload.u) || !record::exists($payload.u)) {
		throw "createUserQuestionNote | u must reference an existing u record";
	};
	if !($payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0)) && (!type::is_record($payload.q) || !record::exists($payload.q)) {
		throw "createUserQuestionNote | q must reference an existing q record";
	};

	let $RID = type::record('uqnote', rand::ulid());

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createUserQuestionNote | failed to create uqnote";
	};

	let $relation0 = (select * from UserQuestionNote where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->UserQuestionNote->$recordID;
	};

	return $recordID;

};
