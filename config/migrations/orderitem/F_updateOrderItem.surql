DEFINE FUNCTION OVERWRITE fn::updateOrderItem($OrderItemID: any, $payload: object) {

	let $rid = fn::ridParam("orderItem", $OrderItemID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateOrderItem | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		currency: if $payload.currency = NONE { $current.currency } else if type::is_array($payload.currency) { $payload.currency } else if $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { $payload.currency } else { fn::ridParam("currency", $payload.currency) },
	});

	let $payload = if !($payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0)) && (!type::is_record($payload.currency) || !record::exists($payload.currency)) {
		fn::objectAssign($payload, {
			currency: NONE,
		})
	} else {
		$payload
	};

	if $payload.kind != NONE {
		if !($payload.kind IN ["product", "productVariant", "extensionProduct", "extensionVariant", "exam", "other"]) {
			throw "updateOrderItem | invalid kind";
		};
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
		throw "updateOrderItem | failed to update OrderItem";
	}

};
