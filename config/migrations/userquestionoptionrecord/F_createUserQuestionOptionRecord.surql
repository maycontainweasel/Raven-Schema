DEFINE FUNCTION OVERWRITE fn::createUserQuestionOptionRecord($PARENT_ID: any, $payload: option<object>) {

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
		$payloadInput.qOption
	};

	let $PARENT_ID = fn::ridParam("qOption", $parentInput);
	if !type::is_record($PARENT_ID) {
		throw "createUserQuestionOptionRecord | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createUserQuestionOptionRecord | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	if $payloadInput.u = NONE || $payloadInput.u = null || (type::is_string($payloadInput.u) && string::len($payloadInput.u) = 0) {
		throw "createUserQuestionOptionRecord | requires u";
	};
	if $payloadInput.qOption = NONE || $payloadInput.qOption = null || (type::is_string($payloadInput.qOption) && string::len($payloadInput.qOption) = 0) {
		throw "createUserQuestionOptionRecord | requires qOption";
	};

	let $defaultData = {
		u: "",
		qOption: "",
		attempts: 0,
		correct: 0,
		incorrect: 0,
		percCorrect: 0,
		order: 0,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $payload = fn::objectAssign($payload, {
		u: if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { null } else { fn::ridParam("u", $payload.u) },
		qOption: if $payload.qOption = NONE || $payload.qOption = null || (type::is_string($payload.qOption) && string::len(string::trim($payload.qOption)) = 0) { null } else { fn::ridParam("qOption", $payload.qOption) },
	});

	let $payload = fn::objectAssign($payload, {
		u: if type::is_array($payload.u) { $payload.u } else if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { $payload.u } else { fn::ridParam("u", $payload.u) },
		qOption: if type::is_array($payload.qOption) { $payload.qOption } else if $payload.qOption = NONE || $payload.qOption = null || (type::is_string($payload.qOption) && string::len(string::trim($payload.qOption)) = 0) { $payload.qOption } else { fn::ridParam("qOption", $payload.qOption) },
	});

	if !($payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0)) && (!type::is_record($payload.u) || !record::exists($payload.u)) {
		throw "createUserQuestionOptionRecord | u must reference an existing u record";
	};
	if !($payload.qOption = NONE || $payload.qOption = null || (type::is_string($payload.qOption) && string::len(string::trim($payload.qOption)) = 0)) && (!type::is_record($payload.qOption) || !record::exists($payload.qOption)) {
		throw "createUserQuestionOptionRecord | qOption must reference an existing qOption record";
	};

	let $RID = type::record('uqor', fn::stringID([$payload.u, $payload.qOption]));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createUserQuestionOptionRecord | failed to create uqor";
	};

	let $relation0 = (select * from UserQuestionOptionRecord where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->UserQuestionOptionRecord->$recordID;
	};

	return $recordID;

};
