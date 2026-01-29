DEFINE FUNCTION OVERWRITE fn::createUserQuestionOptionRecord($PARENT_ID: record<qOption>, $payload: option<object>) {

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else {
		{}
	};

	if !type::is_record($PARENT_ID) {
		throw "createUserQuestionOptionRecord | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createUserQuestionOptionRecord | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	if !$payloadInput.u {
		throw "createUserQuestionOptionRecord | requires u";
	};

	if !$payloadInput.qOption {
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
		u: if type::is_record($payload.u) { $payload.u } else if $payload.u { type::record("u", $payload.u) } else { null },
		qOption: if type::is_record($payload.qOption) { $payload.qOption } else if $payload.qOption { type::record("qOption", $payload.qOption) } else { null },
	});

	let $RID = type::record('uqor', fn::stringID([$payload.u, $payload.qOption]));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
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
