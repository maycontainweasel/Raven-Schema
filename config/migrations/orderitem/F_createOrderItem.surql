DEFINE FUNCTION OVERWRITE fn::createOrderItem($PARENT_ID: any, $payload: option<object>) {

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
		throw "createOrderItem | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createOrderItem | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	if $payloadInput.kind = NONE || $payloadInput.kind = null || (type::is_string($payloadInput.kind) && string::len($payloadInput.kind) = 0) {
		throw "createOrderItem | requires kind";
	};

	if !($payloadInput.kind IN ["product", "productVariant", "extensionProduct", "extensionVariant", "exam", "other"]) {
		throw "createOrderItem | invalid kind";
	};

	let $defaultData = {
		kind: "product",
		refTable: "",
		refId: "",
		label: "",
		description: "",
		quantity: 1,
		unitAmount: 0,
		totalAmount: 0,
		currency: "",
		period: 0,
		numberOfDays: 0,
		stripePriceID: "",
		instance: "",
		metadata: {},
		order: 0,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $payload = fn::objectAssign($payload, {
		currency: if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { null } else { fn::ridParam("currency", $payload.currency) },
	});

	let $payload = fn::objectAssign($payload, {
		currency: if type::is_array($payload.currency) { $payload.currency } else if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { $payload.currency } else { fn::ridParam("currency", $payload.currency) },
	});

	let $payload = if !($payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0)) && (!type::is_record($payload.currency) || !record::exists($payload.currency)) {
		fn::objectAssign($payload, {
			currency: NONE,
		})
	} else {
		$payload
	};

	let $RID = type::record('orderItem', rand::ulid());

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createOrderItem | failed to create orderItem";
	};

	let $relation0 = (select * from OrderItem where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->OrderItem->$recordID;
	};

	return $recordID;

};
