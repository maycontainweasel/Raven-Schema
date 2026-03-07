DEFINE FUNCTION OVERWRITE fn::updatePMInstance($PMInstanceID: any, $payload: object) {

	let $rid = fn::ridParam("pmInstance", $PMInstanceID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updatePMInstance | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		instance: if $payload.instance = NONE { $current.instance } else if type::is_array($payload.instance) { $payload.instance } else if $payload.instance = null || (type::is_string($payload.instance) && string::len(string::trim($payload.instance)) = 0) { $payload.instance } else { fn::ridParam("instance", $payload.instance) },
	});

	if !($payload.instance = NONE || $payload.instance = null || (type::is_string($payload.instance) && string::len(string::trim($payload.instance)) = 0)) && (!type::is_record($payload.instance) || !record::exists($payload.instance)) {
		throw "updatePMInstance | instance must reference an existing instance record";
	};

	if $payload.status != NONE {
		if !($payload.status IN ["active", "inactive", "maintenance"]) {
			throw "updatePMInstance | invalid status";
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
		throw "updatePMInstance | failed to update PMInstance";
	}

};
