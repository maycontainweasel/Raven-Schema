DEFINE FUNCTION OVERWRITE fn::updateProductVariant($ProductVariantID: any, $payload: object) {

	let $rid = fn::ridParam("productVariant", $ProductVariantID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateProductVariant | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		product: if $payload.product = NONE { $current.product } else if type::is_array($payload.product) { $payload.product } else if $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0) { $payload.product } else { fn::ridParam("product", $payload.product) },
		exam: if $payload.exam = NONE { $current.exam } else if type::is_array($payload.exam) { $payload.exam } else if $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0) { $payload.exam } else { fn::ridParam("exam", $payload.exam) },
		currency: if $payload.currency = NONE { $current.currency } else if type::is_array($payload.currency) { $payload.currency } else if $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { $payload.currency } else { fn::ridParam("currency", $payload.currency) },
	});

	if !($payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0)) && (!type::is_record($payload.product) || !record::exists($payload.product)) {
		throw "updateProductVariant | product must reference an existing product record";
	};
	if !($payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0)) && (!type::is_record($payload.exam) || !record::exists($payload.exam)) {
		throw "updateProductVariant | exam must reference an existing exam record";
	};
	if !($payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0)) && (!type::is_record($payload.currency) || !record::exists($payload.currency)) {
		throw "updateProductVariant | currency must reference an existing currency record";
	};

	let $rel_variant = $payload.variant;
	let $rel_variants = $payload.variants;

	let $payload = fn::objectRemove($payload, ["variant", "variants"]);

	let $rel_variant_norm = fn::toRecordArray('order', $rel_variant);
	let $rel_variants_norm = fn::toRecordArray('product', $rel_variants);

	let $result = update $rid merge $payload;
	let $result = if type::is_array($result) { array::first($result) } else { $result };

	// --- Refresh Record views
	update $rid merge {
		"touch": 1
	};
	update $rid unset touch;

	let $PID = fn::PID($rid);

	if(type::is_record($PID) && record::exists($PID)) {
		update $PID merge {
			"touch": 1
		};
		update $PID unset touch;
	};
	// --- End Refresh Record views

	if type::is_array($rel_variant) {
		if array::len($rel_variant_norm) > 1 {
			throw "attach:OrderProductVariant | expects single relation";
		};
	delete from OrderProductVariant where out = $rid;
		if array::len($rel_variant_norm) == 1 {
			fn::createEdge(array::first($rel_variant_norm), "OrderProductVariant", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_variant {
	delete from OrderProductVariant where out = $rid;
		if array::len($rel_variant_norm) > 0 {
			fn::createEdge(array::first($rel_variant_norm), "OrderProductVariant", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_variants) {
	delete from ProductVariants where out = $rid;
		for $rel in $rel_variants_norm {
			fn::createEdge($rel, "ProductVariants", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_variants {
	delete from ProductVariants where out = $rid;
		for $rel in $rel_variants_norm {
			fn::createEdge($rel, "ProductVariants", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateProductVariant | failed to update ProductVariant";
	}

};
