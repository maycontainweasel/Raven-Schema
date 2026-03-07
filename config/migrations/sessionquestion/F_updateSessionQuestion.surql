DEFINE FUNCTION OVERWRITE fn::updateSessionQuestion($SessionQuestionID: any, $payload: object) {

	let $rid = fn::ridParam("SessionQuestions", $SessionQuestionID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateSessionQuestion | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectRemove($payload, ["startTS", "answerTS", "lastUpdated"]);

	let $payload = fn::objectAssign($payload, {
		s: if $payload.s = NONE { $current.s } else if type::is_array($payload.s) { $payload.s } else if $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0) { $payload.s } else { fn::ridParam("s", $payload.s) },
		q: if $payload.q = NONE { $current.q } else if type::is_array($payload.q) { $payload.q } else if $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { $payload.q } else { fn::ridParam("q", $payload.q) },
	});

	if !($payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0)) && (!type::is_record($payload.s) || !record::exists($payload.s)) {
		throw "updateSessionQuestion | s must reference an existing s record";
	};
	if !($payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0)) && (!type::is_record($payload.q) || !record::exists($payload.q)) {
		throw "updateSessionQuestion | q must reference an existing q record";
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
		throw "updateSessionQuestion | failed to update SessionQuestion";
	}

};
