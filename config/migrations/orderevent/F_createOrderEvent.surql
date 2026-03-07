DEFINE FUNCTION OVERWRITE fn::createOrderEvent($PARENT_ID: any, $payload: option<object>) {

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

	let $PARENT_ID = fn::ridParam("order", $parentInput);
	if !type::is_record($PARENT_ID) {
		throw "createOrderEvent | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createOrderEvent | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	if $payloadInput.type = NONE || $payloadInput.type = null || (type::is_string($payloadInput.type) && string::len($payloadInput.type) = 0) {
		throw "createOrderEvent | requires type";
	};
	if $payloadInput.title = NONE || $payloadInput.title = null || (type::is_string($payloadInput.title) && string::len($payloadInput.title) = 0) {
		throw "createOrderEvent | requires title";
	};
	if $payloadInput.occurredAt = NONE || $payloadInput.occurredAt = null || (type::is_string($payloadInput.occurredAt) && string::len($payloadInput.occurredAt) = 0) {
		throw "createOrderEvent | requires occurredAt";
	};

	if !($payloadInput.type IN ["system", "payment", "fulfilment", "customer", "error"]) {
		throw "createOrderEvent | invalid type";
	};

	let $defaultData = {
		type: "system",
		title: "",
		description: "",
		occurredAt: time::now(),
		actor: "",
		severity: "info",
		status: "",
		code: "",
		metadata: {},
		order: 0,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $RID = type::record('orderEvent', rand::ulid());

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createOrderEvent | failed to create orderEvent";
	};

	let $relation0 = (select * from OrderEvent where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->OrderEvent->$recordID;
	};

	return $recordID;

};
