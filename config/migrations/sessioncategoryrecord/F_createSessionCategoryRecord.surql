DEFINE FUNCTION OVERWRITE fn::createSessionCategoryRecord($PARENT_ID: any, $payload: option<object>) {

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
		throw "createSessionCategoryRecord | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createSessionCategoryRecord | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	if $payloadInput.s = NONE || $payloadInput.s = null || (type::is_string($payloadInput.s) && string::len($payloadInput.s) = 0) {
		throw "createSessionCategoryRecord | requires s";
	};
	if $payloadInput.category = NONE || $payloadInput.category = null || (type::is_string($payloadInput.category) && string::len($payloadInput.category) = 0) {
		throw "createSessionCategoryRecord | requires category";
	};

	let $defaultData = {
		s: "",
		category: "",
		attempts: 0,
		noCorrect: 0,
		noIncorrect: 0,
		percCorrect: 0,
		averageTime: 0,
		totalTime: 0,
		order: 0,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $payload = fn::objectAssign($payload, {
		s: if $payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0) { null } else { fn::ridParam("s", $payload.s) },
		category: if $payload.category = NONE || $payload.category = null || (type::is_string($payload.category) && string::len(string::trim($payload.category)) = 0) { null } else { fn::ridParam("qt", $payload.category) },
	});

	let $payload = fn::objectAssign($payload, {
		s: if type::is_array($payload.s) { $payload.s } else if $payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0) { $payload.s } else { fn::ridParam("s", $payload.s) },
		category: if type::is_array($payload.category) { $payload.category } else if $payload.category = NONE || $payload.category = null || (type::is_string($payload.category) && string::len(string::trim($payload.category)) = 0) { $payload.category } else { fn::ridParam("qt", $payload.category) },
	});

	if !($payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0)) && (!type::is_record($payload.s) || !record::exists($payload.s)) {
		throw "createSessionCategoryRecord | s must reference an existing s record";
	};
	if !($payload.category = NONE || $payload.category = null || (type::is_string($payload.category) && string::len(string::trim($payload.category)) = 0)) && (!type::is_record($payload.category) || !record::exists($payload.category)) {
		throw "createSessionCategoryRecord | category must reference an existing qt record";
	};

	let $RID = type::record('scr', fn::stringID([$PARENT_ID, $payload.category]));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createSessionCategoryRecord | failed to create scr";
	};

	let $relation0 = (select * from SessionCategoryRecord where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->SessionCategoryRecord->$recordID;
	};

	return $recordID;

};
