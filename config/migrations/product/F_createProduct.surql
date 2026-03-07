DEFINE FUNCTION OVERWRITE fn::createProduct($payload: object) {

	if !$payload {
		throw "createProduct | payload is required";
	};

	let $subtable_productVariant = $payload.productVariant;

	let $payload = fn::objectRemove($payload, ["productVariant"]);

	if $payload.key = NONE || $payload.key = null || (type::is_string($payload.key) && string::len($payload.key) = 0) {
		throw "createProduct | requires key";
	};
	if $payload.title = NONE || $payload.title = null || (type::is_string($payload.title) && string::len($payload.title) = 0) {
		throw "createProduct | requires title";
	};

	let $defaultData = {
		key: "",
		slug: "",
		title: "",
		description: "",
		stripePID: "",
		instances: [],
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $rel_product = $payload.product;
	let $rel_trialProduct = $payload.trialProduct;
	let $rel_products = $payload.products;

	let $payload = fn::objectRemove($payload, ["product", "trialProduct", "products"]);

	let $rel_product_norm = fn::toRecordArray('order', $rel_product);
	let $rel_trialProduct_norm = fn::toRecordArray('order', $rel_trialProduct);
	let $rel_products_norm = fn::toRecordArray('order', $rel_products);

	if !type::is_array($payload.instances){
		throw "createProduct | requires valid instances array";
	};

	let $rid = type::record('product', $payload.key);
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
		throw "createProduct | failed to create product";
	};

	if type::is_array($rel_product_norm) {
		if array::len($rel_product_norm) > 1 {
			throw "attach:OrderProduct | expects single relation";
		};
		if array::len($rel_product_norm) == 1 {
			fn::createEdge(array::first($rel_product_norm), "OrderProduct", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_product {
		if array::len($rel_product_norm) > 0 {
			fn::createEdge(array::first($rel_product_norm), "OrderProduct", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_trialProduct_norm) {
		if array::len($rel_trialProduct_norm) > 1 {
			throw "attach:OrderTrialProduct | expects single relation";
		};
		if array::len($rel_trialProduct_norm) == 1 {
			fn::createEdge(array::first($rel_trialProduct_norm), "OrderTrialProduct", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_trialProduct {
		if array::len($rel_trialProduct_norm) > 0 {
			fn::createEdge(array::first($rel_trialProduct_norm), "OrderTrialProduct", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_products_norm) {
		for $rel in $rel_products_norm {
			fn::createEdge($rel, "ProductOrders", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_products {
		for $rel in $rel_products_norm {
			fn::createEdge($rel, "ProductOrders", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	if type::is_array($subtable_productVariant) {
		let $subtable_index_productVariant_productVariant = 0;
		for $subtable_item_productVariant_productVariant in $subtable_productVariant {
			let $subtable_payload_productVariant_productVariant = if type::is_object($subtable_item_productVariant_productVariant) { $subtable_item_productVariant_productVariant } else if $subtable_item_productVariant_productVariant = NONE || $subtable_item_productVariant_productVariant = null { {} } else { { label: $subtable_item_productVariant_productVariant } };
			let $subtable_payload_productVariant_productVariant = if $subtable_payload_productVariant_productVariant.order = NONE {
				fn::objectAssign($subtable_payload_productVariant_productVariant, { order: $subtable_index_productVariant_productVariant })
			} else {
				$subtable_payload_productVariant_productVariant
			};
			fn::createProductVariant($recordID, fn::objectAssign($subtable_payload_productVariant_productVariant, { skipExists: true }));
			let $subtable_index_productVariant_productVariant = $subtable_index_productVariant_productVariant + 1;
		};
	} else if type::is_object($subtable_productVariant) || $subtable_productVariant {
		let $subtable_payload_productVariant_productVariant = if type::is_object($subtable_productVariant) { $subtable_productVariant } else if $subtable_productVariant = NONE || $subtable_productVariant = null { {} } else { { label: $subtable_productVariant } };
		let $subtable_payload_productVariant_productVariant = if $subtable_payload_productVariant_productVariant.order = NONE {
			fn::objectAssign($subtable_payload_productVariant_productVariant, { order: 0 })
		} else {
			$subtable_payload_productVariant_productVariant
		};
		fn::createProductVariant($recordID, fn::objectAssign($subtable_payload_productVariant_productVariant, { skipExists: true }));
	};


	return if $record {
		return $record;
	} else {
		throw "createProduct | failed to create product";
	}

};

