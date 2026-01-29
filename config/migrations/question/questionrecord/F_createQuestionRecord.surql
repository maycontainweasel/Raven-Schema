DEFINE FUNCTION OVERWRITE fn::createQuestionRecord($PARENT_ID: record<q>, $payload: option<object>) {

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else {
		{}
	};

	if !type::is_record($PARENT_ID) {
		throw "createQuestionRecord | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createQuestionRecord | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	let $defaultData = {
		q: type::record("q", $PARENT_ID),
		attempts: 0,
		noCorrect: 0,
		noIncorrect: 0,
		percCorrect: 0,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $RID = type::record('qRecord', record::id($PARENT_ID));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createQuestionRecord | failed to create qRecord";
	};

	let $relation0 = (select * from QuestionRecord where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->QuestionRecord->$recordID;
	};

	return $recordID;

};
