DEFINE FUNCTION OVERWRITE fn::createQuestionOptionRecord($PARENT_ID: any, $payload: option<object>) {

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
		throw "createQuestionOptionRecord | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createQuestionOptionRecord | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	if $payloadInput.q = NONE || $payloadInput.q = null || (type::is_string($payloadInput.q) && string::len($payloadInput.q) = 0) {
		throw "createQuestionOptionRecord | requires q";
	};
	if $payloadInput.qOption = NONE || $payloadInput.qOption = null || (type::is_string($payloadInput.qOption) && string::len($payloadInput.qOption) = 0) {
		throw "createQuestionOptionRecord | requires qOption";
	};

	let $defaultData = {
		q: "",
		qOption: "",
		attempts: 0,
		noCorrect: 0,
		noIncorrect: 0,
		percCorrect: 0,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $payload = fn::objectAssign($payload, {
		q: if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { null } else { fn::ridParam("q", $payload.q) },
		qOption: if $payload.qOption = NONE || $payload.qOption = null || (type::is_string($payload.qOption) && string::len(string::trim($payload.qOption)) = 0) { null } else { fn::ridParam("qOption", $payload.qOption) },
	});

	let $payload = fn::objectAssign($payload, {
		q: if type::is_array($payload.q) { $payload.q } else if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { $payload.q } else { fn::ridParam("q", $payload.q) },
		qOption: if type::is_array($payload.qOption) { $payload.qOption } else if $payload.qOption = NONE || $payload.qOption = null || (type::is_string($payload.qOption) && string::len(string::trim($payload.qOption)) = 0) { $payload.qOption } else { fn::ridParam("qOption", $payload.qOption) },
	});

	if !($payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0)) && (!type::is_record($payload.q) || !record::exists($payload.q)) {
		throw "createQuestionOptionRecord | q must reference an existing q record";
	};
	if !($payload.qOption = NONE || $payload.qOption = null || (type::is_string($payload.qOption) && string::len(string::trim($payload.qOption)) = 0)) && (!type::is_record($payload.qOption) || !record::exists($payload.qOption)) {
		throw "createQuestionOptionRecord | qOption must reference an existing qOption record";
	};

	let $RID = type::record('qor', record::id($PARENT_ID));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createQuestionOptionRecord | failed to create qor";
	};

	let $relation0 = (select * from QuestionOptionRecord where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->QuestionOptionRecord->$recordID;
	};

	return $recordID;

};
