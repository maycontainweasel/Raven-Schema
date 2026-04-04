DEFINE FUNCTION OVERWRITE fn::updateMonthlySnapshot($MonthlySnapshotID: any, $payload: object) {

	let $rid = fn::ridParam("monthlySnapshot", $MonthlySnapshotID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateMonthlySnapshot | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE { $current.space } else if type::is_array($payload.space) { $payload.space } else if $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "updateMonthlySnapshot | space must reference an existing financialSpace record";
	};

	if $payload.status != NONE {
		if !($payload.status IN ["draft", "final"]) {
			throw "updateMonthlySnapshot | invalid status";
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
		throw "updateMonthlySnapshot | failed to update MonthlySnapshot";
	}

};
