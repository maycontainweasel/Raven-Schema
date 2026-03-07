DEFINE FUNCTION OVERWRITE fn::updateSessionEvent($SessionEventID: any, $payload: object) {

	let $rid = fn::ridParam("se", $SessionEventID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "s" { type::record("se", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateSessionEvent | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectRemove($payload, ["payload", "q", "sq"]);

	let $payload = fn::objectAssign($payload, {
		q: if $payload.q = NONE { $current.q } else if type::is_array($payload.q) { $payload.q } else if $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { $payload.q } else { fn::ridParam("q", $payload.q) },
		sq: if $payload.sq = NONE { $current.sq } else if type::is_array($payload.sq) { $payload.sq } else if $payload.sq = null || (type::is_string($payload.sq) && string::len(string::trim($payload.sq)) = 0) { $payload.sq } else { fn::ridParam("SessionQuestions", $payload.sq) },
	});

	let $payload = if !($payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0)) && (!type::is_record($payload.q) || !record::exists($payload.q)) {
		fn::objectAssign($payload, {
			q: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.sq = NONE || $payload.sq = null || (type::is_string($payload.sq) && string::len(string::trim($payload.sq)) = 0)) && (!type::is_record($payload.sq) || !record::exists($payload.sq)) {
		fn::objectAssign($payload, {
			sq: NONE,
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
		throw "updateSessionEvent | failed to update SessionEvent";
	}

};
