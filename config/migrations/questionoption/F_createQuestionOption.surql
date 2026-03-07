DEFINE FUNCTION OVERWRITE fn::createQuestionOption($PARENT_ID: any, $payload: option<object>) {

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
		throw "createQuestionOption | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createQuestionOption | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	let $subtable_questionOptionRecord = $payloadInput.questionOptionRecord;
	let $subtable_userQuestionOptionRecord = $payloadInput.userQuestionOptionRecord;

	let $payloadInput = fn::objectRemove($payloadInput, ["questionOptionRecord", "userQuestionOptionRecord"]);

	if $payloadInput.label = NONE || $payloadInput.label = null || (type::is_string($payloadInput.label) && string::len($payloadInput.label) = 0) {
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
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createQuestionOption | failed to create qOption";
	};

	let $relation0 = (select * from QuestionOption where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->QuestionOption->$recordID;
	};

	if type::is_array($subtable_questionOptionRecord) {
		if array::len($subtable_questionOptionRecord) > 0 {
			let $subtable_item_questionOptionRecord_qor = array::first($subtable_questionOptionRecord);
			let $subtable_payload_questionOptionRecord_qor = if type::is_object($subtable_item_questionOptionRecord_qor) { $subtable_item_questionOptionRecord_qor } else if $subtable_item_questionOptionRecord_qor = NONE || $subtable_item_questionOptionRecord_qor = null { {} } else { { attempts: $subtable_item_questionOptionRecord_qor } };
			fn::createQuestionOptionRecord($recordID, fn::objectAssign($subtable_payload_questionOptionRecord_qor, { skipExists: true }));
		} else if true {
			fn::createQuestionOptionRecord($recordID, { skipExists: true });
		};
	} else if type::is_object($subtable_questionOptionRecord) || $subtable_questionOptionRecord {
		let $subtable_payload_questionOptionRecord_qor = if type::is_object($subtable_questionOptionRecord) { $subtable_questionOptionRecord } else if $subtable_questionOptionRecord = NONE || $subtable_questionOptionRecord = null { {} } else { { attempts: $subtable_questionOptionRecord } };
		fn::createQuestionOptionRecord($recordID, fn::objectAssign($subtable_payload_questionOptionRecord_qor, { skipExists: true }));
	} else if true {
		fn::createQuestionOptionRecord($recordID, { skipExists: true });
	};

	if type::is_array($subtable_userQuestionOptionRecord) {
		let $subtable_index_userQuestionOptionRecord_uqor = 0;
		for $subtable_item_userQuestionOptionRecord_uqor in $subtable_userQuestionOptionRecord {
			let $subtable_payload_userQuestionOptionRecord_uqor = if type::is_object($subtable_item_userQuestionOptionRecord_uqor) { $subtable_item_userQuestionOptionRecord_uqor } else if $subtable_item_userQuestionOptionRecord_uqor = NONE || $subtable_item_userQuestionOptionRecord_uqor = null { {} } else { { attempts: $subtable_item_userQuestionOptionRecord_uqor } };
			let $subtable_payload_userQuestionOptionRecord_uqor = if $subtable_payload_userQuestionOptionRecord_uqor.order = NONE {
				fn::objectAssign($subtable_payload_userQuestionOptionRecord_uqor, { order: $subtable_index_userQuestionOptionRecord_uqor })
			} else {
				$subtable_payload_userQuestionOptionRecord_uqor
			};
			fn::createUserQuestionOptionRecord($recordID, fn::objectAssign($subtable_payload_userQuestionOptionRecord_uqor, { skipExists: true }));
			let $subtable_index_userQuestionOptionRecord_uqor = $subtable_index_userQuestionOptionRecord_uqor + 1;
		};
	} else if type::is_object($subtable_userQuestionOptionRecord) || $subtable_userQuestionOptionRecord {
		let $subtable_payload_userQuestionOptionRecord_uqor = if type::is_object($subtable_userQuestionOptionRecord) { $subtable_userQuestionOptionRecord } else if $subtable_userQuestionOptionRecord = NONE || $subtable_userQuestionOptionRecord = null { {} } else { { attempts: $subtable_userQuestionOptionRecord } };
		let $subtable_payload_userQuestionOptionRecord_uqor = if $subtable_payload_userQuestionOptionRecord_uqor.order = NONE {
			fn::objectAssign($subtable_payload_userQuestionOptionRecord_uqor, { order: 0 })
		} else {
			$subtable_payload_userQuestionOptionRecord_uqor
		};
		fn::createUserQuestionOptionRecord($recordID, fn::objectAssign($subtable_payload_userQuestionOptionRecord_uqor, { skipExists: true }));
	};


	return $recordID;

};
