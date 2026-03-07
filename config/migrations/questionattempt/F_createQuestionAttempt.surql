DEFINE FUNCTION OVERWRITE fn::createQuestionAttempt($payload: object) {

	if !$payload {
		throw "createQuestionAttempt | payload is required";
	};

	let $payload = fn::objectRemove($payload, ["startTS", "answerTS", "create_at", "_reconciliationKey"]);

	if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len($payload.q) = 0) {
		throw "createQuestionAttempt | requires q";
	};
	if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len($payload.u) = 0) {
		throw "createQuestionAttempt | requires u";
	};
	if $payload.selectedOptionID = NONE || $payload.selectedOptionID = null || (type::is_string($payload.selectedOptionID) && string::len($payload.selectedOptionID) = 0) {
		throw "createQuestionAttempt | requires selectedOptionID";
	};

	let $defaultData = {
		s: "",
		q: "",
		u: "",
		selectedOptionID: "",
		correct: false,
		order: 0,
		startTS: "",
		answerTS: "",
		totalTime: 0,
		create_at: "",
		exams: type::record("exam", []),
		examsTerms: [],
		categories: type::record("exam", []),
		categoryIds: type::record("qt", []),
		_reconciliationKey: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		s: if $payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0) { null } else { fn::ridParam("s", $payload.s) },
		q: if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { null } else { fn::ridParam("q", $payload.q) },
		u: if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { null } else { fn::ridParam("u", $payload.u) },
		selectedOptionID: if $payload.selectedOptionID = NONE || $payload.selectedOptionID = null || (type::is_string($payload.selectedOptionID) && string::len(string::trim($payload.selectedOptionID)) = 0) { null } else { fn::ridParam("qo", $payload.selectedOptionID) },
	});

	let $payload = fn::objectAssign($payload, {
		s: if type::is_array($payload.s) { $payload.s } else if $payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0) { $payload.s } else { fn::ridParam("s", $payload.s) },
		q: if type::is_array($payload.q) { $payload.q } else if $payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { $payload.q } else { fn::ridParam("q", $payload.q) },
		u: if type::is_array($payload.u) { $payload.u } else if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { $payload.u } else { fn::ridParam("u", $payload.u) },
		selectedOptionID: if type::is_array($payload.selectedOptionID) { $payload.selectedOptionID } else if $payload.selectedOptionID = NONE || $payload.selectedOptionID = null || (type::is_string($payload.selectedOptionID) && string::len(string::trim($payload.selectedOptionID)) = 0) { $payload.selectedOptionID } else { fn::ridParam("qo", $payload.selectedOptionID) },
		exams: if type::is_array($payload.exams) { $payload.exams } else if $payload.exams = NONE || $payload.exams = null || (type::is_string($payload.exams) && string::len(string::trim($payload.exams)) = 0) { $payload.exams } else { fn::ridParam("exam", $payload.exams) },
		categories: if type::is_array($payload.categories) { $payload.categories } else if $payload.categories = NONE || $payload.categories = null || (type::is_string($payload.categories) && string::len(string::trim($payload.categories)) = 0) { $payload.categories } else { fn::ridParam("exam", $payload.categories) },
		categoryIds: if type::is_array($payload.categoryIds) { $payload.categoryIds } else if $payload.categoryIds = NONE || $payload.categoryIds = null || (type::is_string($payload.categoryIds) && string::len(string::trim($payload.categoryIds)) = 0) { $payload.categoryIds } else { fn::ridParam("qt", $payload.categoryIds) },
	});

	let $payload = if !($payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0)) && (!type::is_record($payload.s) || !record::exists($payload.s)) {
		fn::objectAssign($payload, {
			s: NONE,
		})
	} else {
		$payload
	};
	if !($payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0)) && (!type::is_record($payload.q) || !record::exists($payload.q)) {
		throw "createQuestionAttempt | q must reference an existing q record";
	};
	if !($payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0)) && (!type::is_record($payload.u) || !record::exists($payload.u)) {
		throw "createQuestionAttempt | u must reference an existing u record";
	};
	if !($payload.selectedOptionID = NONE || $payload.selectedOptionID = null || (type::is_string($payload.selectedOptionID) && string::len(string::trim($payload.selectedOptionID)) = 0)) && (!type::is_record($payload.selectedOptionID) || !record::exists($payload.selectedOptionID)) {
		throw "createQuestionAttempt | selectedOptionID must reference an existing qo record";
	};
	let $payload = if !($payload.categories = NONE || $payload.categories = null || (type::is_string($payload.categories) && string::len(string::trim($payload.categories)) = 0)) && (!type::is_record($payload.categories) || !record::exists($payload.categories)) {
		fn::objectAssign($payload, {
			categories: NONE,
		})
	} else {
		$payload
	};

	let $rel_u = $payload.u;
	let $rel_q = $payload.q;
	let $rel_s = $payload.s;
	let $rel_exams = $payload.exams;
	let $rel_categoryIds = $payload.categoryIds;

	let $rel_u_norm = fn::toRecordArray('u', $rel_u);
	let $payload = fn::objectAssign($payload, {
		u: if type::is_array($rel_u) { $rel_u_norm } else { $payload.u }
	});

	let $rel_q_norm = fn::toRecordArray('q', $rel_q);
	let $payload = fn::objectAssign($payload, {
		q: if type::is_array($rel_q) { $rel_q_norm } else { $payload.q }
	});

	let $rel_s_norm = fn::toRecordArray('s', $rel_s);
	let $payload = fn::objectAssign($payload, {
		s: if type::is_array($rel_s) { $rel_s_norm } else { $payload.s }
	});

	let $rel_exams_norm = fn::toRecordArray('exam', $rel_exams);
	let $payload = fn::objectAssign($payload, {
		exams: if type::is_array($rel_exams) { $rel_exams_norm } else { $payload.exams }
	});

	let $rel_categoryIds_norm = fn::toRecordArray('qt', $rel_categoryIds);
	let $payload = fn::objectAssign($payload, {
		categoryIds: if type::is_array($rel_categoryIds) { $rel_categoryIds_norm } else { $payload.categoryIds }
	});


	let $record = upsert qa content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createQuestionAttempt | failed to create qa";
	};

	if type::is_array($rel_u_norm) {
		for $rel in $rel_u_norm {
			fn::createEdge($rel, "UserAttempts", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_u {
		for $rel in $rel_u_norm {
			fn::createEdge($rel, "UserAttempts", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_q_norm) {
		for $rel in $rel_q_norm {
			fn::createEdge($rel, "QuestionAttempts", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_q {
		for $rel in $rel_q_norm {
			fn::createEdge($rel, "QuestionAttempts", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_s_norm) {
		for $rel in $rel_s_norm {
			fn::createEdge($rel, "SessionAttempts", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_s {
		for $rel in $rel_s_norm {
			fn::createEdge($rel, "SessionAttempts", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_exams_norm) {
		for $rel in $rel_exams_norm {
			fn::createEdge($rel, "ExamAttempts", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_exams {
		for $rel in $rel_exams_norm {
			fn::createEdge($rel, "ExamAttempts", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_categoryIds_norm) {
		for $rel in $rel_categoryIds_norm {
			fn::createEdge($rel, "TermAttempts", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_categoryIds {
		for $rel in $rel_categoryIds_norm {
			fn::createEdge($rel, "TermAttempts", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	return if $record {
		return $record;
	} else {
		throw "createQuestionAttempt | failed to create qa";
	}

};

