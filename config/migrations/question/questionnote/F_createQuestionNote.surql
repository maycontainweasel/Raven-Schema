DEFINE FUNCTION OVERWRITE fn::createQuestionNote($PARENT_ID: any, $payload: option<object>) {

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
		throw "createQuestionNote | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createQuestionNote | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	let $payloadInput = fn::objectRemove($payloadInput, ["updatedAt", "updatedBy"]);

	if $payloadInput.q = NONE || $payloadInput.q = null || (type::is_string($payloadInput.q) && string::len($payloadInput.q) = 0) {
		throw "createQuestionNote | requires q";
	};
	if $payloadInput.createdAt = NONE || $payloadInput.createdAt = null || (type::is_string($payloadInput.createdAt) && string::len($payloadInput.createdAt) = 0) {
		throw "createQuestionNote | requires createdAt";
	};
	if $payloadInput.createdBy = NONE || $payloadInput.createdBy = null || (type::is_string($payloadInput.createdBy) && string::len($payloadInput.createdBy) = 0) {
		throw "createQuestionNote | requires createdBy";
	};
	if $payloadInput.createdByName = NONE || $payloadInput.createdByName = null || (type::is_string($payloadInput.createdByName) && string::len($payloadInput.createdByName) = 0) {
		throw "createQuestionNote | requires createdByName";
	};

	let $defaultData = {
		q: "",
		note: "",
		order: 0,
		createdAt: time::now(),
		createdBy: "",
		createdByName: "",
		updatedAt: "",
		updatedBy: "",
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $payload = fn::objectAssign($payload, {
		q: if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { null } else { fn::ridParam("q", $payload.q) },
		createdBy: if $payload.createdBy = NONE || $payload.createdBy = null || (type::is_string($payload.createdBy) && string::len(string::trim($payload.createdBy)) = 0) { null } else { fn::ridParam("u", $payload.createdBy) },
	});

	let $payload = fn::objectAssign($payload, {
		q: if type::is_array($payload.q) { $payload.q } else if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { $payload.q } else { fn::ridParam("q", $payload.q) },
		createdBy: if type::is_array($payload.createdBy) { $payload.createdBy } else if $payload.createdBy = NONE || $payload.createdBy = null || (type::is_string($payload.createdBy) && string::len(string::trim($payload.createdBy)) = 0) { $payload.createdBy } else { fn::ridParam("u", $payload.createdBy) },
		updatedBy: if type::is_array($payload.updatedBy) { $payload.updatedBy } else if $payload.updatedBy = NONE || $payload.updatedBy = null || (type::is_string($payload.updatedBy) && string::len(string::trim($payload.updatedBy)) = 0) { $payload.updatedBy } else { fn::ridParam("u", $payload.updatedBy) },
	});

	if !($payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0)) && (!type::is_record($payload.q) || !record::exists($payload.q)) {
		throw "createQuestionNote | q must reference an existing q record";
	};
	if !($payload.createdBy = NONE || $payload.createdBy = null || (type::is_string($payload.createdBy) && string::len(string::trim($payload.createdBy)) = 0)) && (!type::is_record($payload.createdBy) || !record::exists($payload.createdBy)) {
		throw "createQuestionNote | createdBy must reference an existing u record";
	};
	let $payload = if !($payload.updatedBy = NONE || $payload.updatedBy = null || (type::is_string($payload.updatedBy) && string::len(string::trim($payload.updatedBy)) = 0)) && (!type::is_record($payload.updatedBy) || !record::exists($payload.updatedBy)) {
		fn::objectAssign($payload, {
			updatedBy: NONE,
		})
	} else {
		$payload
	};

	let $RID = type::record('qnote', rand::ulid());

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createQuestionNote | failed to create qnote";
	};

	let $relation0 = (select * from QuestionNote where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->QuestionNote->$recordID;
	};

	return $recordID;

};
