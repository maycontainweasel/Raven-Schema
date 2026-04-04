DEFINE FUNCTION OVERWRITE fn::updateFinancialSpace($FinancialSpaceID: any, $payload: object) {

	let $rid = fn::ridParam("financialSpace", $FinancialSpaceID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateFinancialSpace | payload is required";
	};

	let $current = (select * from $rid)[0];

	if $payload.spaceType != NONE {
		if !($payload.spaceType IN ["personal", "business", "trading", "family", "other"]) {
			throw "updateFinancialSpace | invalid spaceType";
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
		throw "updateFinancialSpace | failed to update FinancialSpace";
	}

};
