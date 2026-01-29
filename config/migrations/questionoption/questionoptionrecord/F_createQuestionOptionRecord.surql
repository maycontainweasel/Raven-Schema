DEFINE FUNCTION OVERWRITE fn::createQuestionOptionRecord($PARENT_ID: record<qOption>, $payload: option<object>) {

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else {
		{}
	};

	if !type::is_record($PARENT_ID) {
		throw "createQuestionOptionRecord | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createQuestionOptionRecord | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	if !$payloadInput.q {
		throw "createQuestionOptionRecord | requires q";
	};

	if !$payloadInput.qOption {
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
		q: if type::is_record($payload.q) { $payload.q } else if $payload.q { type::record("q", $payload.q) } else { null },
		qOption: if type::is_record($payload.qOption) { $payload.qOption } else if $payload.qOption { type::record("qOption", $payload.qOption) } else { null },
	});

	let $RID = type::record('qor', record::id($PARENT_ID));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
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
