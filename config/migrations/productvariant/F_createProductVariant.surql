DEFINE FUNCTION OVERWRITE fn::createProductVariant($PARENT_ID: any, $payload: option<object>) {

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
		$payloadInput.product
	};

	let $PARENT_ID = fn::ridParam("product", $parentInput);
	if !type::is_record($PARENT_ID) {
		throw "createProductVariant | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createProductVariant | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	if $payloadInput.productKey = NONE || $payloadInput.productKey = null || (type::is_string($payloadInput.productKey) && string::len($payloadInput.productKey) = 0) {
		throw "createProductVariant | requires productKey";
	};
	if $payloadInput.examKey = NONE || $payloadInput.examKey = null || (type::is_string($payloadInput.examKey) && string::len($payloadInput.examKey) = 0) {
		throw "createProductVariant | requires examKey";
	};
	if $payloadInput.product = NONE || $payloadInput.product = null || (type::is_string($payloadInput.product) && string::len($payloadInput.product) = 0) {
		throw "createProductVariant | requires product";
	};
	if $payloadInput.exam = NONE || $payloadInput.exam = null || (type::is_string($payloadInput.exam) && string::len($payloadInput.exam) = 0) {
		throw "createProductVariant | requires exam";
	};
	if $payloadInput.period = NONE || $payloadInput.period = null || (type::is_string($payloadInput.period) && string::len($payloadInput.period) = 0) {
		throw "createProductVariant | requires period";
	};
	if $payloadInput.currency = NONE || $payloadInput.currency = null || (type::is_string($payloadInput.currency) && string::len($payloadInput.currency) = 0) {
		throw "createProductVariant | requires currency";
	};
	if $payloadInput.value = NONE || $payloadInput.value = null || (type::is_string($payloadInput.value) && string::len($payloadInput.value) = 0) {
		throw "createProductVariant | requires value";
	};

	let $defaultData = {
		productKey: "",
		examKey: "",
		product: "",
		exam: "",
		period: 0,
		currency: "",
		value: 0,
		label: "",
		stripePriceID: "",
		order: 0,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $payload = fn::objectAssign($payload, {
		product: if $payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0) { null } else { fn::ridParam("product", $payload.product) },
		exam: if $payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0) { null } else { fn::ridParam("exam", $payload.exam) },
		currency: if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { null } else { fn::ridParam("currency", $payload.currency) },
	});

	let $payload = fn::objectAssign($payload, {
		product: if type::is_array($payload.product) { $payload.product } else if $payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0) { $payload.product } else { fn::ridParam("product", $payload.product) },
		exam: if type::is_array($payload.exam) { $payload.exam } else if $payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0) { $payload.exam } else { fn::ridParam("exam", $payload.exam) },
		currency: if type::is_array($payload.currency) { $payload.currency } else if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { $payload.currency } else { fn::ridParam("currency", $payload.currency) },
	});

	if !($payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0)) && (!type::is_record($payload.product) || !record::exists($payload.product)) {
		throw "createProductVariant | product must reference an existing product record";
	};
	if !($payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0)) && (!type::is_record($payload.exam) || !record::exists($payload.exam)) {
		throw "createProductVariant | exam must reference an existing exam record";
	};
	if !($payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0)) && (!type::is_record($payload.currency) || !record::exists($payload.currency)) {
		throw "createProductVariant | currency must reference an existing currency record";
	};

	let $RID = type::record('productVariant', fn::stringID([$payload.productKey, $payload.period, $payload.currency]));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createProductVariant | failed to create productVariant";
	};

	let $relation0 = (select * from ProductVariant where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->ProductVariant->$recordID;
	};

	let $relation1 = (select * from ProductVariants where in = $PARENT_ID and out = $recordID);
	if !$relation1 || array::len($relation1) = 0 {
		relate only $PARENT_ID->ProductVariants->$recordID;
	};

	return $recordID;

};
