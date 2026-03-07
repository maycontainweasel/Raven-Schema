DEFINE FUNCTION OVERWRITE fn::createSessionEvent($PARENT_ID: any, $payload: option<object>) {

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
		NONE
	};

	let $PARENT_ID = fn::ridParam("s", $parentInput);
	if !type::is_record($PARENT_ID) {
		throw "createSessionEvent | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createSessionEvent | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	let $payloadInput = fn::objectRemove($payloadInput, ["payload", "q", "sq"]);

	if $payloadInput.action = NONE || $payloadInput.action = null || (type::is_string($payloadInput.action) && string::len($payloadInput.action) = 0) {
		throw "createSessionEvent | requires action";
	};
	if $payloadInput.time = NONE || $payloadInput.time = null || (type::is_string($payloadInput.time) && string::len($payloadInput.time) = 0) {
		throw "createSessionEvent | requires time";
	};

	let $defaultData = {
		action: "",
		time: "",
		payload: {},
		q: "",
		sq: "",
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $payload = fn::objectAssign($payload, {
		q: if type::is_array($payload.q) { $payload.q } else if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { $payload.q } else { fn::ridParam("q", $payload.q) },
		sq: if type::is_array($payload.sq) { $payload.sq } else if $payload.sq = NONE || $payload.sq = null || (type::is_string($payload.sq) && string::len(string::trim($payload.sq)) = 0) { $payload.sq } else { fn::ridParam("SessionQuestions", $payload.sq) },
	});

	let $payload = if !($payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0)) && (!type::is_record($payload.q) || !record::exists($payload.q)) {
		fn::objectAssign($payload, {
			q: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.sq = NONE || $payload.sq = null || (type::is_string($payload.sq) && string::len(string::trim($payload.sq)) = 0)) && (!type::is_record($payload.sq) || !record::exists($payload.sq)) {
		fn::objectAssign($payload, {
			sq: NONE,
		})
	} else {
		$payload
	};

	let $RID = type::record('se', record::id($PARENT_ID));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createSessionEvent | failed to create se";
	};

	let $relation0 = (select * from SessionEvent where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->SessionEvent->$recordID;
	};

	return $recordID;

};
