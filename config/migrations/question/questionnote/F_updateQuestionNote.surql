DEFINE FUNCTION OVERWRITE fn::updateQuestionNote($QuestionNoteID: any, $payload: object) {

	let $rid = fn::ridParam("qnote", $QuestionNoteID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "q" { type::record("qnote", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateQuestionNote | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectRemove($payload, ["updatedAt", "updatedBy"]);

	let $payload = fn::objectAssign($payload, {
		q: if $payload.q = NONE { $current.q } else if type::is_array($payload.q) { $payload.q } else if $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { $payload.q } else { fn::ridParam("q", $payload.q) },
		createdBy: if $payload.createdBy = NONE { $current.createdBy } else if type::is_array($payload.createdBy) { $payload.createdBy } else if $payload.createdBy = null || (type::is_string($payload.createdBy) && string::len(string::trim($payload.createdBy)) = 0) { $payload.createdBy } else { fn::ridParam("u", $payload.createdBy) },
		updatedBy: if $payload.updatedBy = NONE { $current.updatedBy } else if type::is_array($payload.updatedBy) { $payload.updatedBy } else if $payload.updatedBy = null || (type::is_string($payload.updatedBy) && string::len(string::trim($payload.updatedBy)) = 0) { $payload.updatedBy } else { fn::ridParam("u", $payload.updatedBy) },
	});

	if !($payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0)) && (!type::is_record($payload.q) || !record::exists($payload.q)) {
		throw "updateQuestionNote | q must reference an existing q record";
	};
	if !($payload.createdBy = NONE || $payload.createdBy = null || (type::is_string($payload.createdBy) && string::len(string::trim($payload.createdBy)) = 0)) && (!type::is_record($payload.createdBy) || !record::exists($payload.createdBy)) {
		throw "updateQuestionNote | createdBy must reference an existing u record";
	};
	let $payload = if !($payload.updatedBy = NONE || $payload.updatedBy = null || (type::is_string($payload.updatedBy) && string::len(string::trim($payload.updatedBy)) = 0)) && (!type::is_record($payload.updatedBy) || !record::exists($payload.updatedBy)) {
		fn::objectAssign($payload, {
			updatedBy: NONE,
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
		throw "updateQuestionNote | failed to update QuestionNote";
	}

};
