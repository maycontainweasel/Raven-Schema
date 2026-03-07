DEFINE FUNCTION OVERWRITE fn::updateExtensionVariant($ExtensionVariantID: any, $payload: object) {

	let $rid = fn::ridParam("extensionVariant", $ExtensionVariantID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateExtensionVariant | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		product: if $payload.product = NONE { $current.product } else if type::is_array($payload.product) { $payload.product } else if $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0) { $payload.product } else { fn::ridParam("product", $payload.product) },
		exam: if $payload.exam = NONE { $current.exam } else if type::is_array($payload.exam) { $payload.exam } else if $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0) { $payload.exam } else { fn::ridParam("exam", $payload.exam) },
		productVariant: if $payload.productVariant = NONE { $current.productVariant } else if type::is_array($payload.productVariant) { $payload.productVariant } else if $payload.productVariant = null || (type::is_string($payload.productVariant) && string::len(string::trim($payload.productVariant)) = 0) { $payload.productVariant } else { fn::ridParam("productVariant", $payload.productVariant) },
		extensionProduct: if $payload.extensionProduct = NONE { $current.extensionProduct } else if type::is_array($payload.extensionProduct) { $payload.extensionProduct } else if $payload.extensionProduct = null || (type::is_string($payload.extensionProduct) && string::len(string::trim($payload.extensionProduct)) = 0) { $payload.extensionProduct } else { fn::ridParam("extensionProduct", $payload.extensionProduct) },
		currency: if $payload.currency = NONE { $current.currency } else if type::is_array($payload.currency) { $payload.currency } else if $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { $payload.currency } else { fn::ridParam("currency", $payload.currency) },
	});

	if !($payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0)) && (!type::is_record($payload.product) || !record::exists($payload.product)) {
		throw "updateExtensionVariant | product must reference an existing product record";
	};
	if !($payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0)) && (!type::is_record($payload.exam) || !record::exists($payload.exam)) {
		throw "updateExtensionVariant | exam must reference an existing exam record";
	};
	if !($payload.productVariant = NONE || $payload.productVariant = null || (type::is_string($payload.productVariant) && string::len(string::trim($payload.productVariant)) = 0)) && (!type::is_record($payload.productVariant) || !record::exists($payload.productVariant)) {
		throw "updateExtensionVariant | productVariant must reference an existing productVariant record";
	};
	if !($payload.extensionProduct = NONE || $payload.extensionProduct = null || (type::is_string($payload.extensionProduct) && string::len(string::trim($payload.extensionProduct)) = 0)) && (!type::is_record($payload.extensionProduct) || !record::exists($payload.extensionProduct)) {
		throw "updateExtensionVariant | extensionProduct must reference an existing extensionProduct record";
	};
	if !($payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0)) && (!type::is_record($payload.currency) || !record::exists($payload.currency)) {
		throw "updateExtensionVariant | currency must reference an existing currency record";
	};

	let $rel_variants = $payload.variants;
	let $rel_extensionVariant = $payload.extensionVariant;

	let $payload = fn::objectRemove($payload, ["variants", "extensionVariant"]);

	let $rel_variants_norm = fn::toRecordArray('extensionProduct', $rel_variants);
	let $rel_extensionVariant_norm = fn::toRecordArray('order', $rel_extensionVariant);

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

	if type::is_array($rel_variants) {
	delete from ExtensionVariants where out = $rid;
		for $rel in $rel_variants_norm {
			fn::createEdge($rel, "ExtensionVariants", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_variants {
	delete from ExtensionVariants where out = $rid;
		for $rel in $rel_variants_norm {
			fn::createEdge($rel, "ExtensionVariants", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_extensionVariant) {
		if array::len($rel_extensionVariant_norm) > 1 {
			throw "attach:OrderExtensionVariant | expects single relation";
		};
	delete from OrderExtensionVariant where out = $rid;
		if array::len($rel_extensionVariant_norm) == 1 {
			fn::createEdge(array::first($rel_extensionVariant_norm), "OrderExtensionVariant", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_extensionVariant {
	delete from OrderExtensionVariant where out = $rid;
		if array::len($rel_extensionVariant_norm) > 0 {
			fn::createEdge(array::first($rel_extensionVariant_norm), "OrderExtensionVariant", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateExtensionVariant | failed to update ExtensionVariant";
	}

};
