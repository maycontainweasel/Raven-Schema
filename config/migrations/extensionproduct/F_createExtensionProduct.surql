DEFINE FUNCTION OVERWRITE fn::createExtensionProduct($payload: object) {

	if !$payload {
		throw "createExtensionProduct | payload is required";
	};

	let $subtable_extensionVariant = $payload.extensionVariant;

	let $payload = fn::objectRemove($payload, ["extensionVariant"]);

	if $payload.productKey = NONE || $payload.productKey = null || (type::is_string($payload.productKey) && string::len($payload.productKey) = 0) {
		throw "createExtensionProduct | requires productKey";
	};
	if $payload.examKey = NONE || $payload.examKey = null || (type::is_string($payload.examKey) && string::len($payload.examKey) = 0) {
		throw "createExtensionProduct | requires examKey";
	};
	if $payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len($payload.product) = 0) {
		throw "createExtensionProduct | requires product";
	};
	if $payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len($payload.exam) = 0) {
		throw "createExtensionProduct | requires exam";
	};
	if $payload.productVariant = NONE || $payload.productVariant = null || (type::is_string($payload.productVariant) && string::len($payload.productVariant) = 0) {
		throw "createExtensionProduct | requires productVariant";
	};
	if $payload.period = NONE || $payload.period = null || (type::is_string($payload.period) && string::len($payload.period) = 0) {
		throw "createExtensionProduct | requires period";
	};
	if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len($payload.currency) = 0) {
		throw "createExtensionProduct | requires currency";
	};

	let $defaultData = {
		productKey: "",
		examKey: "",
		product: "",
		exam: "",
		productVariant: "",
		period: 0,
		currency: "",
		stripePID: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		product: if $payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0) { null } else { fn::ridParam("product", $payload.product) },
		exam: if $payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0) { null } else { fn::ridParam("exam", $payload.exam) },
		productVariant: if $payload.productVariant = NONE || $payload.productVariant = null || (type::is_string($payload.productVariant) && string::len(string::trim($payload.productVariant)) = 0) { null } else { fn::ridParam("productVariant", $payload.productVariant) },
		currency: if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { null } else { fn::ridParam("currency", $payload.currency) },
	});

	let $payload = fn::objectAssign($payload, {
		product: if type::is_array($payload.product) { $payload.product } else if $payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0) { $payload.product } else { fn::ridParam("product", $payload.product) },
		exam: if type::is_array($payload.exam) { $payload.exam } else if $payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0) { $payload.exam } else { fn::ridParam("exam", $payload.exam) },
		productVariant: if type::is_array($payload.productVariant) { $payload.productVariant } else if $payload.productVariant = NONE || $payload.productVariant = null || (type::is_string($payload.productVariant) && string::len(string::trim($payload.productVariant)) = 0) { $payload.productVariant } else { fn::ridParam("productVariant", $payload.productVariant) },
		currency: if type::is_array($payload.currency) { $payload.currency } else if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { $payload.currency } else { fn::ridParam("currency", $payload.currency) },
	});

	if !($payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0)) && (!type::is_record($payload.product) || !record::exists($payload.product)) {
		throw "createExtensionProduct | product must reference an existing product record";
	};
	if !($payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0)) && (!type::is_record($payload.exam) || !record::exists($payload.exam)) {
		throw "createExtensionProduct | exam must reference an existing exam record";
	};
	if !($payload.productVariant = NONE || $payload.productVariant = null || (type::is_string($payload.productVariant) && string::len(string::trim($payload.productVariant)) = 0)) && (!type::is_record($payload.productVariant) || !record::exists($payload.productVariant)) {
		throw "createExtensionProduct | productVariant must reference an existing productVariant record";
	};
	if !($payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0)) && (!type::is_record($payload.currency) || !record::exists($payload.currency)) {
		throw "createExtensionProduct | currency must reference an existing currency record";
	};

	let $rel_extensionProduct = $payload.extensionProduct;
	let $rel_extensionProduct = $payload.extensionProduct;

	let $payload = fn::objectRemove($payload, ["extensionProduct", "extensionProduct"]);

	let $rel_extensionProduct_norm = fn::toRecordArray('order', $rel_extensionProduct);
	let $rel_extensionProduct_norm = fn::toRecordArray('productVariant', $rel_extensionProduct);

	let $rid = type::record('extensionProduct', fn::stringID([$payload.productKey, $payload.period, $payload.currency]));
	let $payload = fn::objectRemove($payload, ["id"]);
	let $record = upsert $rid content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $record = if $record { $record } else {
		let $fallback = select * from only $rid;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createExtensionProduct | failed to create extensionProduct";
	};

	if type::is_array($rel_extensionProduct_norm) {
		if array::len($rel_extensionProduct_norm) > 1 {
			throw "attach:OrderExtensionProduct | expects single relation";
		};
		if array::len($rel_extensionProduct_norm) == 1 {
			fn::createEdge(array::first($rel_extensionProduct_norm), "OrderExtensionProduct", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_extensionProduct {
		if array::len($rel_extensionProduct_norm) > 0 {
			fn::createEdge(array::first($rel_extensionProduct_norm), "OrderExtensionProduct", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_extensionProduct_norm) {
		if array::len($rel_extensionProduct_norm) > 1 {
			throw "attach:VariantExtensionProduct | expects single relation";
		};
		if array::len($rel_extensionProduct_norm) == 1 {
			fn::createEdge(array::first($rel_extensionProduct_norm), "VariantExtensionProduct", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_extensionProduct {
		if array::len($rel_extensionProduct_norm) > 0 {
			fn::createEdge(array::first($rel_extensionProduct_norm), "VariantExtensionProduct", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	if type::is_array($subtable_extensionVariant) {
		let $subtable_index_extensionVariant_extensionVariant = 0;
		for $subtable_item_extensionVariant_extensionVariant in $subtable_extensionVariant {
			let $subtable_payload_extensionVariant_extensionVariant = if type::is_object($subtable_item_extensionVariant_extensionVariant) { $subtable_item_extensionVariant_extensionVariant } else if $subtable_item_extensionVariant_extensionVariant = NONE || $subtable_item_extensionVariant_extensionVariant = null { {} } else { { value: $subtable_item_extensionVariant_extensionVariant } };
			let $subtable_payload_extensionVariant_extensionVariant = if $subtable_payload_extensionVariant_extensionVariant.order = NONE {
				fn::objectAssign($subtable_payload_extensionVariant_extensionVariant, { order: $subtable_index_extensionVariant_extensionVariant })
			} else {
				$subtable_payload_extensionVariant_extensionVariant
			};
			fn::createExtensionVariant($recordID, fn::objectAssign($subtable_payload_extensionVariant_extensionVariant, { skipExists: true }));
			let $subtable_index_extensionVariant_extensionVariant = $subtable_index_extensionVariant_extensionVariant + 1;
		};
	} else if type::is_object($subtable_extensionVariant) || $subtable_extensionVariant {
		let $subtable_payload_extensionVariant_extensionVariant = if type::is_object($subtable_extensionVariant) { $subtable_extensionVariant } else if $subtable_extensionVariant = NONE || $subtable_extensionVariant = null { {} } else { { value: $subtable_extensionVariant } };
		let $subtable_payload_extensionVariant_extensionVariant = if $subtable_payload_extensionVariant_extensionVariant.order = NONE {
			fn::objectAssign($subtable_payload_extensionVariant_extensionVariant, { order: 0 })
		} else {
			$subtable_payload_extensionVariant_extensionVariant
		};
		fn::createExtensionVariant($recordID, fn::objectAssign($subtable_payload_extensionVariant_extensionVariant, { skipExists: true }));
	};


	return if $record {
		return $record;
	} else {
		throw "createExtensionProduct | failed to create extensionProduct";
	}

};

