DEFINE FUNCTION OVERWRITE fn::updateExtensionProduct($ExtensionProductID: any, $payload: object) {

	let $rid = fn::ridParam("extensionProduct", $ExtensionProductID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateExtensionProduct | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		product: if $payload.product = NONE { $current.product } else if type::is_array($payload.product) { $payload.product } else if $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0) { $payload.product } else { fn::ridParam("product", $payload.product) },
		exam: if $payload.exam = NONE { $current.exam } else if type::is_array($payload.exam) { $payload.exam } else if $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0) { $payload.exam } else { fn::ridParam("exam", $payload.exam) },
		productVariant: if $payload.productVariant = NONE { $current.productVariant } else if type::is_array($payload.productVariant) { $payload.productVariant } else if $payload.productVariant = null || (type::is_string($payload.productVariant) && string::len(string::trim($payload.productVariant)) = 0) { $payload.productVariant } else { fn::ridParam("productVariant", $payload.productVariant) },
		currency: if $payload.currency = NONE { $current.currency } else if type::is_array($payload.currency) { $payload.currency } else if $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { $payload.currency } else { fn::ridParam("currency", $payload.currency) },
	});

	if !($payload.product = NONE || $payload.product = null || (type::is_string($payload.product) && string::len(string::trim($payload.product)) = 0)) && (!type::is_record($payload.product) || !record::exists($payload.product)) {
		throw "updateExtensionProduct | product must reference an existing product record";
	};
	if !($payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0)) && (!type::is_record($payload.exam) || !record::exists($payload.exam)) {
		throw "updateExtensionProduct | exam must reference an existing exam record";
	};
	if !($payload.productVariant = NONE || $payload.productVariant = null || (type::is_string($payload.productVariant) && string::len(string::trim($payload.productVariant)) = 0)) && (!type::is_record($payload.productVariant) || !record::exists($payload.productVariant)) {
		throw "updateExtensionProduct | productVariant must reference an existing productVariant record";
	};
	if !($payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0)) && (!type::is_record($payload.currency) || !record::exists($payload.currency)) {
		throw "updateExtensionProduct | currency must reference an existing currency record";
	};

	let $rel_extensionProduct = $payload.extensionProduct;
	let $rel_extensionProduct = $payload.extensionProduct;

	let $payload = fn::objectRemove($payload, ["extensionProduct", "extensionProduct"]);

	let $rel_extensionProduct_norm = fn::toRecordArray('order', $rel_extensionProduct);
	let $rel_extensionProduct_norm = fn::toRecordArray('productVariant', $rel_extensionProduct);

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

	if type::is_array($rel_extensionProduct) {
		if array::len($rel_extensionProduct_norm) > 1 {
			throw "attach:OrderExtensionProduct | expects single relation";
		};
	delete from OrderExtensionProduct where out = $rid;
		if array::len($rel_extensionProduct_norm) == 1 {
			fn::createEdge(array::first($rel_extensionProduct_norm), "OrderExtensionProduct", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_extensionProduct {
	delete from OrderExtensionProduct where out = $rid;
		if array::len($rel_extensionProduct_norm) > 0 {
			fn::createEdge(array::first($rel_extensionProduct_norm), "OrderExtensionProduct", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_extensionProduct) {
		if array::len($rel_extensionProduct_norm) > 1 {
			throw "attach:VariantExtensionProduct | expects single relation";
		};
	delete from VariantExtensionProduct where out = $rid;
		if array::len($rel_extensionProduct_norm) == 1 {
			fn::createEdge(array::first($rel_extensionProduct_norm), "VariantExtensionProduct", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_extensionProduct {
	delete from VariantExtensionProduct where out = $rid;
		if array::len($rel_extensionProduct_norm) > 0 {
			fn::createEdge(array::first($rel_extensionProduct_norm), "VariantExtensionProduct", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateExtensionProduct | failed to update ExtensionProduct";
	}

};
