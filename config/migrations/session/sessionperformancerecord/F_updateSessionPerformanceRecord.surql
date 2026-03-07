DEFINE FUNCTION OVERWRITE fn::updateSessionPerformanceRecord($SessionPerformanceRecordID: any, $payload: object) {

	let $rid = fn::ridParam("spr", $SessionPerformanceRecordID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "s" { type::record("spr", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateSessionPerformanceRecord | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		s: if $payload.s = NONE { $current.s } else if type::is_array($payload.s) { $payload.s } else if $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0) { $payload.s } else { fn::ridParam("s", $payload.s) },
		u: if $payload.u = NONE { $current.u } else if type::is_array($payload.u) { $payload.u } else if $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { $payload.u } else { fn::ridParam("u", $payload.u) },
	});

	if !($payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0)) && (!type::is_record($payload.s) || !record::exists($payload.s)) {
		throw "updateSessionPerformanceRecord | s must reference an existing s record";
	};
	if !($payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0)) && (!type::is_record($payload.u) || !record::exists($payload.u)) {
		throw "updateSessionPerformanceRecord | u must reference an existing u record";
	};

	let $rel_record = $payload.record;

	let $payload = fn::objectRemove($payload, ["record"]);

	let $rel_record_norm = fn::toRecordArray('s', $rel_record);

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

	if type::is_array($rel_record) {
		if array::len($rel_record_norm) > 1 {
			throw "attach:SessionRecord | expects single relation";
		};
	delete from SessionRecord where out = $rid;
		if array::len($rel_record_norm) == 1 {
			fn::createEdge(array::first($rel_record_norm), "SessionRecord", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_record {
	delete from SessionRecord where out = $rid;
		if array::len($rel_record_norm) > 0 {
			fn::createEdge(array::first($rel_record_norm), "SessionRecord", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateSessionPerformanceRecord | failed to update SessionPerformanceRecord";
	}

};
