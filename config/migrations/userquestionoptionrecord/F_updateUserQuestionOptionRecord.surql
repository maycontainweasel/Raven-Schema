DEFINE FUNCTION OVERWRITE fn::updateUserQuestionOptionRecord($UserQuestionOptionRecordID: any, $payload: object) {

	let $rid = fn::ridParam("uqor", $UserQuestionOptionRecordID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateUserQuestionOptionRecord | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		u: if $payload.u = NONE { $current.u } else if type::is_array($payload.u) { $payload.u } else if $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { $payload.u } else { fn::ridParam("u", $payload.u) },
		qOption: if $payload.qOption = NONE { $current.qOption } else if type::is_array($payload.qOption) { $payload.qOption } else if $payload.qOption = null || (type::is_string($payload.qOption) && string::len(string::trim($payload.qOption)) = 0) { $payload.qOption } else { fn::ridParam("qOption", $payload.qOption) },
	});

	if !($payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0)) && (!type::is_record($payload.u) || !record::exists($payload.u)) {
		throw "updateUserQuestionOptionRecord | u must reference an existing u record";
	};
	if !($payload.qOption = NONE || $payload.qOption = null || (type::is_string($payload.qOption) && string::len(string::trim($payload.qOption)) = 0)) && (!type::is_record($payload.qOption) || !record::exists($payload.qOption)) {
		throw "updateUserQuestionOptionRecord | qOption must reference an existing qOption record";
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
		throw "updateUserQuestionOptionRecord | failed to update UserQuestionOptionRecord";
	}

};
