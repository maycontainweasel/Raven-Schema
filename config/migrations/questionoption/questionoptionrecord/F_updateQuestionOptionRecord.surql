DEFINE FUNCTION OVERWRITE fn::updateQuestionOptionRecord($QuestionOptionRecordID: any, $payload: object) {

	let $rid = fn::ridParam("qor", $QuestionOptionRecordID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "qOption" { type::record("qor", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateQuestionOptionRecord | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		q: if $payload.q = NONE { $current.q } else if type::is_array($payload.q) { $payload.q } else if $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { $payload.q } else { fn::ridParam("q", $payload.q) },
		qOption: if $payload.qOption = NONE { $current.qOption } else if type::is_array($payload.qOption) { $payload.qOption } else if $payload.qOption = null || (type::is_string($payload.qOption) && string::len(string::trim($payload.qOption)) = 0) { $payload.qOption } else { fn::ridParam("qOption", $payload.qOption) },
	});

	if !($payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0)) && (!type::is_record($payload.q) || !record::exists($payload.q)) {
		throw "updateQuestionOptionRecord | q must reference an existing q record";
	};
	if !($payload.qOption = NONE || $payload.qOption = null || (type::is_string($payload.qOption) && string::len(string::trim($payload.qOption)) = 0)) && (!type::is_record($payload.qOption) || !record::exists($payload.qOption)) {
		throw "updateQuestionOptionRecord | qOption must reference an existing qOption record";
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
		throw "updateQuestionOptionRecord | failed to update QuestionOptionRecord";
	}

};
