DEFINE FUNCTION OVERWRITE fn::createSessionPerformanceRecord($PARENT_ID: any, $payload: option<object>) {

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
		$payloadInput.s
	};

	let $PARENT_ID = fn::ridParam("s", $parentInput);
	if !type::is_record($PARENT_ID) {
		throw "createSessionPerformanceRecord | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createSessionPerformanceRecord | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	if $payloadInput.s = NONE || $payloadInput.s = null || (type::is_string($payloadInput.s) && string::len($payloadInput.s) = 0) {
		throw "createSessionPerformanceRecord | requires s";
	};
	if $payloadInput.u = NONE || $payloadInput.u = null || (type::is_string($payloadInput.u) && string::len($payloadInput.u) = 0) {
		throw "createSessionPerformanceRecord | requires u";
	};
	if $payloadInput.qTotal = NONE || $payloadInput.qTotal = null || (type::is_string($payloadInput.qTotal) && string::len($payloadInput.qTotal) = 0) {
		throw "createSessionPerformanceRecord | requires qTotal";
	};

	let $defaultData = {
		s: "",
		u: "",
		qTotal: 0,
		attempts: 0,
		noCorrect: 0,
		noIncorrect: 0,
		noComplete: 0,
		noIncomplete: 0,
		percComplete: 0,
		percCorrect: 0,
		percCorrectAttempted: 0,
		totalSessionTime: 0,
		averageTimePerQ: 0,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $payload = fn::objectAssign($payload, {
		s: if $payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0) { null } else { fn::ridParam("s", $payload.s) },
		u: if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { null } else { fn::ridParam("u", $payload.u) },
	});

	let $payload = fn::objectAssign($payload, {
		s: if type::is_array($payload.s) { $payload.s } else if $payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0) { $payload.s } else { fn::ridParam("s", $payload.s) },
		u: if type::is_array($payload.u) { $payload.u } else if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { $payload.u } else { fn::ridParam("u", $payload.u) },
	});

	if !($payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0)) && (!type::is_record($payload.s) || !record::exists($payload.s)) {
		throw "createSessionPerformanceRecord | s must reference an existing s record";
	};
	if !($payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0)) && (!type::is_record($payload.u) || !record::exists($payload.u)) {
		throw "createSessionPerformanceRecord | u must reference an existing u record";
	};

	let $RID = type::record('spr', record::id($PARENT_ID));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createSessionPerformanceRecord | failed to create spr";
	};

	let $relation0 = (select * from SessionPerformanceRecord where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->SessionPerformanceRecord->$recordID;
	};

	return $recordID;

};
