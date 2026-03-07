DEFINE FUNCTION OVERWRITE fn::updateSession($SessionID: any, $payload: object) {

	let $rid = fn::ridParam("s", $SessionID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateSession | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectRemove($payload, ["dateLastActive", "dateLastTouch", "dateCompleted", "qActiveID"]);

	let $payload = fn::objectAssign($payload, {
		u: if $payload.u = NONE { $current.u } else if type::is_array($payload.u) { $payload.u } else if $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { $payload.u } else { fn::ridParam("u", $payload.u) },
		exams: if $payload.exams = NONE { $current.exams } else if type::is_array($payload.exams) { $payload.exams } else if $payload.exams = null || (type::is_string($payload.exams) && string::len(string::trim($payload.exams)) = 0) { $payload.exams } else { fn::ridParam("exam", $payload.exams) },
		categories: if $payload.categories = NONE { $current.categories } else if type::is_array($payload.categories) { $payload.categories } else if $payload.categories = null || (type::is_string($payload.categories) && string::len(string::trim($payload.categories)) = 0) { $payload.categories } else { fn::ridParam("exam", $payload.categories) },
		qids: if $payload.qids = NONE { $current.qids } else if type::is_array($payload.qids) { $payload.qids } else if $payload.qids = null || (type::is_string($payload.qids) && string::len(string::trim($payload.qids)) = 0) { $payload.qids } else { fn::ridParam("q", $payload.qids) },
		qActiveID: if $payload.qActiveID = NONE { $current.qActiveID } else if type::is_array($payload.qActiveID) { $payload.qActiveID } else if $payload.qActiveID = null || (type::is_string($payload.qActiveID) && string::len(string::trim($payload.qActiveID)) = 0) { $payload.qActiveID } else { fn::ridParam("q", $payload.qActiveID) },
	});

	if !($payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0)) && (!type::is_record($payload.u) || !record::exists($payload.u)) {
		throw "updateSession | u must reference an existing u record";
	};
	let $payload = if !($payload.categories = NONE || $payload.categories = null || (type::is_string($payload.categories) && string::len(string::trim($payload.categories)) = 0)) && (!type::is_record($payload.categories) || !record::exists($payload.categories)) {
		fn::objectAssign($payload, {
			categories: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.qActiveID = NONE || $payload.qActiveID = null || (type::is_string($payload.qActiveID) && string::len(string::trim($payload.qActiveID)) = 0)) && (!type::is_record($payload.qActiveID) || !record::exists($payload.qActiveID)) {
		fn::objectAssign($payload, {
			qActiveID: NONE,
		})
	} else {
		$payload
	};

	if $payload.mode != NONE {
		if !($payload.mode IN ["learn", "exam"]) {
			throw "updateSession | invalid mode";
		};
	};
	if $payload.state != NONE {
		if !($payload.state IN ["untouched", "in-progress", "paused", "complete"]) {
			throw "updateSession | invalid state";
		};
	};
	if $payload.familiarity != NONE {
		if !($payload.familiarity IN ["all", "new", "incorrect"]) {
			throw "updateSession | invalid familiarity";
		};
	};

	let $rel_questions = $payload.questions;
	let $rel_sessions = $payload.sessions;
	let $rel_sessions = $payload.sessions;

	let $payload = fn::objectRemove($payload, ["questions", "sessions", "sessions"]);

	let $rel_questions_norm = fn::toRecordArray('s', $rel_questions);
	let $rel_sessions_norm = fn::toRecordArray('u', $rel_sessions);
	let $rel_sessions_norm = fn::toRecordArray('exam', $rel_sessions);

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

	if type::is_array($rel_questions) {
	delete from SessionQuestions where in = $rid;
		for $rel in $rel_questions_norm {
			fn::createEdge($rel, "SessionQuestions", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_questions {
	delete from SessionQuestions where in = $rid;
		for $rel in $rel_questions_norm {
			fn::createEdge($rel, "SessionQuestions", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_sessions) {
	delete from UserSessions where out = $rid;
		for $rel in $rel_sessions_norm {
			fn::createEdge($rel, "UserSessions", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_sessions {
	delete from UserSessions where out = $rid;
		for $rel in $rel_sessions_norm {
			fn::createEdge($rel, "UserSessions", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_sessions) {
	delete from ExamSessions where out = $rid;
		for $rel in $rel_sessions_norm {
			fn::createEdge($rel, "ExamSessions", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_sessions {
	delete from ExamSessions where out = $rid;
		for $rel in $rel_sessions_norm {
			fn::createEdge($rel, "ExamSessions", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateSession | failed to update Session";
	}

};
