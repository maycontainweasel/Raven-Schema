DEFINE FUNCTION OVERWRITE fn::updateOrder($OrderID: any, $payload: object) {

	let $rid = fn::ridParam("order", $OrderID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateOrder | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		u: if $payload.u = NONE { $current.u } else if type::is_array($payload.u) { $payload.u } else if $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { $payload.u } else { fn::ridParam("u", $payload.u) },
		uSubscription: if $payload.uSubscription = NONE { $current.uSubscription } else if type::is_array($payload.uSubscription) { $payload.uSubscription } else if $payload.uSubscription = null || (type::is_string($payload.uSubscription) && string::len(string::trim($payload.uSubscription)) = 0) { $payload.uSubscription } else { fn::ridParam("uSubscription", $payload.uSubscription) },
		exam: if $payload.exam = NONE { $current.exam } else if type::is_array($payload.exam) { $payload.exam } else if $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0) { $payload.exam } else { fn::ridParam("exam", $payload.exam) },
		productID: if $payload.productID = NONE { $current.productID } else if type::is_array($payload.productID) { $payload.productID } else if $payload.productID = null || (type::is_string($payload.productID) && string::len(string::trim($payload.productID)) = 0) { $payload.productID } else { fn::ridParam("product", $payload.productID) },
		variantID: if $payload.variantID = NONE { $current.variantID } else if type::is_array($payload.variantID) { $payload.variantID } else if $payload.variantID = null || (type::is_string($payload.variantID) && string::len(string::trim($payload.variantID)) = 0) { $payload.variantID } else { fn::ridParam("productVariant", $payload.variantID) },
		extensionID: if $payload.extensionID = NONE { $current.extensionID } else if type::is_array($payload.extensionID) { $payload.extensionID } else if $payload.extensionID = null || (type::is_string($payload.extensionID) && string::len(string::trim($payload.extensionID)) = 0) { $payload.extensionID } else { fn::ridParam("extensionVariant", $payload.extensionID) },
		currency: if $payload.currency = NONE { $current.currency } else if type::is_array($payload.currency) { $payload.currency } else if $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { $payload.currency } else { fn::ridParam("currency", $payload.currency) },
	});

	if !($payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0)) && (!type::is_record($payload.u) || !record::exists($payload.u)) {
		throw "updateOrder | u must reference an existing u record";
	};
	let $payload = if !($payload.uSubscription = NONE || $payload.uSubscription = null || (type::is_string($payload.uSubscription) && string::len(string::trim($payload.uSubscription)) = 0)) && (!type::is_record($payload.uSubscription) || !record::exists($payload.uSubscription)) {
		fn::objectAssign($payload, {
			uSubscription: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0)) && (!type::is_record($payload.exam) || !record::exists($payload.exam)) {
		fn::objectAssign($payload, {
			exam: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.productID = NONE || $payload.productID = null || (type::is_string($payload.productID) && string::len(string::trim($payload.productID)) = 0)) && (!type::is_record($payload.productID) || !record::exists($payload.productID)) {
		fn::objectAssign($payload, {
			productID: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.variantID = NONE || $payload.variantID = null || (type::is_string($payload.variantID) && string::len(string::trim($payload.variantID)) = 0)) && (!type::is_record($payload.variantID) || !record::exists($payload.variantID)) {
		fn::objectAssign($payload, {
			variantID: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.extensionID = NONE || $payload.extensionID = null || (type::is_string($payload.extensionID) && string::len(string::trim($payload.extensionID)) = 0)) && (!type::is_record($payload.extensionID) || !record::exists($payload.extensionID)) {
		fn::objectAssign($payload, {
			extensionID: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0)) && (!type::is_record($payload.currency) || !record::exists($payload.currency)) {
		fn::objectAssign($payload, {
			currency: NONE,
		})
	} else {
		$payload
	};

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

	return if $result {
		return $result;
	} else {
		throw "updateOrder | failed to update Order";
	}

};
