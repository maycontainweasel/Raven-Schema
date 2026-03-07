DEFINE FUNCTION OVERWRITE fn::createQuestionPerformanceRecord($PARENT_ID: any, $payload: option<object>) {

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

	let $PARENT_ID = fn::ridParam("q", $parentInput);
	if !type::is_record($PARENT_ID) {
		throw "createQuestionPerformanceRecord | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createQuestionPerformanceRecord | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	let $defaultData = {
		attempts: 0,
		noCorrect: 0,
		noIncorrect: 0,
		percCorrect: 0,
		totalTime: 0,
		averageTime: 0,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $RID = type::record('qpr', record::id($PARENT_ID));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createQuestionPerformanceRecord | failed to create qpr";
	};

	let $relation0 = (select * from QuestionPerformanceRecord where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->QuestionPerformanceRecord->$recordID;
	};

	return $recordID;

};
