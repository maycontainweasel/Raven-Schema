DEFINE FUNCTION OVERWRITE fn::updateOrderEvent($OrderEventID: any, $payload: object) {

	let $rid = fn::ridParam("orderEvent", $OrderEventID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateOrderEvent | payload is required";
	};

	let $current = (select * from $rid)[0];

	if $payload.type != NONE {
		if !($payload.type IN ["system", "payment", "fulfilment", "customer", "error"]) {
			throw "updateOrderEvent | invalid type";
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
		throw "updateOrderEvent | failed to update OrderEvent";
	}

};
