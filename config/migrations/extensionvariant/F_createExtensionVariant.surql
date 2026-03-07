DEFINE FUNCTION OVERWRITE fn::createExtensionVariant($PARENT_ID: any, $payload: option<object>) {

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
		$payloadInput.extensionProduct
	};

	let $PARENT_ID = fn::ridParam("extensionProduct", $parentInput);
	if !type::is_record($PARENT_ID) {
		throw "createExtensionVariant | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createExtensionVariant | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

	if $payloadInput.productKey = NONE || $payloadInput.productKey = null || (type::is_string($payloadInput.productKey) && string::len($payloadInput.productKey) = 0) {
		throw "createExtensionVariant | requires productKey";
	};
	if $payloadInput.examKey = NONE || $payloadInput.examKey = null || (type::is_string($payloadInput.examKey) && string::len($payloadInput.examKey) = 0) {
		throw "createExtensionVariant | requires examKey";
	};
	if $payloadInput.product = NONE || $payloadInput.product = null || (type::is_string($payloadInput.product) && string::len($payloadInput.product) = 0) {
		throw "createExtensionVariant | requires product";
	};
	if $payloadInput.exam = NONE || $payloadInput.exam = null || (type::is_string($payloadInput.exam) && string::len($payloadInput.exam) = 0) {
		throw "createExtensionVariant | requires exam";
	};
	if $payloadInput.productVariant = NONE || $payloadInput.productVariant = null || (type::is_string($payloadInput.productVariant) && string::len($payloadInput.productVariant) = 0) {
		throw "createExtensionVariant | requires productVariant";
	};
	if $payloadInput.extensionProduct = NONE || $payloadInput.extensionProduct = null || (type::is_string($payloadInput.extensionProduct) && string::len($payloadInput.extensionProduct) = 0) {
		throw "createExtensionVariant | requires extensionProduct";
	};
	if $payloadInput.period = NONE || $payloadInput.period = null || (type::is_string($payloadInput.period) && string::len($payloadInput.period) = 0) {
		throw "createExtensionVariant | requires period";
	};
	if $payloadInput.currency = NONE || $payloadInput.currency = null || (type::is_string($payloadInput.currency) && string::len($payloadInput.currency) = 0) {
		throw "createExtensionVariant | requires currency";
	};
	if $payloadInput.numberOfDays = NONE || $payloadInput.numberOfDays = null || (type::is_string($payloadInput.numberOfDays) && string::len($payloadInput.numberOfDays) = 0) {
		throw "createExtensionVariant | requires numberOfDays";
	};
	if $payloadInput.value = NONE || $payloadInput.value = null || (type::is_string($payloadInput.value) && string::len($payloadInput.value) = 0) {
		throw "createExtensionVariant | requires value";
	};

	let $defaultData = {
		productKey: "",
		examKey: "",
		product: "",
		exam: "",
		productVariant: "",
		extensionProduct: "",
		period: 0,
		currency: "",
		numberOfDays: 0,
		value: 0,
		stripePriceID: "",
		order: 0,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $payload = fn::objectAssign($payload, {
		product: if $payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0) { null } else { fn::ridParam("product", $payload.product) },
		exam: if $payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0) { null } else { fn::ridParam("exam", $payload.exam) },
		productVariant: if $payload.productVariant = NONE || $payload.productVariant = null || (type::is_string($payload.productVariant) && string::len(string::trim($payload.productVariant)) = 0) { null } else { fn::ridParam("productVariant", $payload.productVariant) },
		extensionProduct: if $payload.extensionProduct = NONE || $payload.extensionProduct = null || (type::is_string($payload.extensionProduct) && string::len(string::trim($payload.extensionProduct)) = 0) { null } else { fn::ridParam("extensionProduct", $payload.extensionProduct) },
		currency: if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { null } else { fn::ridParam("currency", $payload.currency) },
	});

	let $payload = fn::objectAssign($payload, {
		product: if type::is_array($payload.product) { $payload.product } else if $payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0) { $payload.product } else { fn::ridParam("product", $payload.product) },
		exam: if type::is_array($payload.exam) { $payload.exam } else if $payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0) { $payload.exam } else { fn::ridParam("exam", $payload.exam) },
		productVariant: if type::is_array($payload.productVariant) { $payload.productVariant } else if $payload.productVariant = NONE || $payload.productVariant = null || (type::is_string($payload.productVariant) && string::len(string::trim($payload.productVariant)) = 0) { $payload.productVariant } else { fn::ridParam("productVariant", $payload.productVariant) },
		extensionProduct: if type::is_array($payload.extensionProduct) { $payload.extensionProduct } else if $payload.extensionProduct = NONE || $payload.extensionProduct = null || (type::is_string($payload.extensionProduct) && string::len(string::trim($payload.extensionProduct)) = 0) { $payload.extensionProduct } else { fn::ridParam("extensionProduct", $payload.extensionProduct) },
		currency: if type::is_array($payload.currency) { $payload.currency } else if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { $payload.currency } else { fn::ridParam("currency", $payload.currency) },
	});

	if !($payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0)) && (!type::is_record($payload.product) || !record::exists($payload.product)) {
		throw "createExtensionVariant | product must reference an existing product record";
	};
	if !($payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0)) && (!type::is_record($payload.exam) || !record::exists($payload.exam)) {
		throw "createExtensionVariant | exam must reference an existing exam record";
	};
	if !($payload.productVariant = NONE || $payload.productVariant = null || (type::is_string($payload.productVariant) && string::len(string::trim($payload.productVariant)) = 0)) && (!type::is_record($payload.productVariant) || !record::exists($payload.productVariant)) {
		throw "createExtensionVariant | productVariant must reference an existing productVariant record";
	};
	if !($payload.extensionProduct = NONE || $payload.extensionProduct = null || (type::is_string($payload.extensionProduct) && string::len(string::trim($payload.extensionProduct)) = 0)) && (!type::is_record($payload.extensionProduct) || !record::exists($payload.extensionProduct)) {
		throw "createExtensionVariant | extensionProduct must reference an existing extensionProduct record";
	};
	if !($payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0)) && (!type::is_record($payload.currency) || !record::exists($payload.currency)) {
		throw "createExtensionVariant | currency must reference an existing currency record";
	};

	let $RID = type::record('extensionVariant', fn::stringID([$payload.productKey, $payload.period, $payload.currency, $payload.numberOfDays]));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createExtensionVariant | failed to create extensionVariant";
	};

	let $relation0 = (select * from ExtensionVariant where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->ExtensionVariant->$recordID;
	};

	return $recordID;

};
