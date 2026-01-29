DEFINE FUNCTION OVERWRITE fn::createQuestionOption($PARENT_ID: record<q>, $payload: option<object>) {

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else {
		{}
	};

	if !type::is_record($PARENT_ID) {
		throw "createQuestionOption | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createQuestionOption | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	if !$payloadInput.label {
		throw "createQuestionOption | requires label";
	};

	let $defaultData = {
		optionKey: "",
		label: "",
		correct: false,
		order: 0,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $payload = fn::objectAssign($payload, {
		optionKey: crypto::md5($payload.label),
	});

	let $RID = type::record('qOption', fn::stringID([$PARENT_ID, $payload.optionKey]));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createQuestionOption | failed to create qOption";
	};

	let $relation0 = (select * from QuestionOption where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->QuestionOption->$recordID;
	};

	return $recordID;

};
