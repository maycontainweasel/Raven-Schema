DEFINE FUNCTION OVERWRITE fn::updateQuestionAttempt($QuestionAttemptID: any, $payload: object) {

	let $rid = fn::ridParam("qa", $QuestionAttemptID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateQuestionAttempt | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectRemove($payload, ["startTS", "answerTS", "create_at", "_reconciliationKey"]);

	let $payload = fn::objectAssign($payload, {
		s: if $payload.s = NONE { $current.s } else if type::is_array($payload.s) { $payload.s } else if $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0) { $payload.s } else { fn::ridParam("s", $payload.s) },
		q: if $payload.q = NONE { $current.q } else if type::is_array($payload.q) { $payload.q } else if $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0) { $payload.q } else { fn::ridParam("q", $payload.q) },
		u: if $payload.u = NONE { $current.u } else if type::is_array($payload.u) { $payload.u } else if $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { $payload.u } else { fn::ridParam("u", $payload.u) },
		selectedOptionID: if $payload.selectedOptionID = NONE { $current.selectedOptionID } else if type::is_array($payload.selectedOptionID) { $payload.selectedOptionID } else if $payload.selectedOptionID = null || (type::is_string($payload.selectedOptionID) && string::len(string::trim($payload.selectedOptionID)) = 0) { $payload.selectedOptionID } else { fn::ridParam("qo", $payload.selectedOptionID) },
		exams: if $payload.exams = NONE { $current.exams } else if type::is_array($payload.exams) { $payload.exams } else if $payload.exams = null || (type::is_string($payload.exams) && string::len(string::trim($payload.exams)) = 0) { $payload.exams } else { fn::ridParam("exam", $payload.exams) },
		categories: if $payload.categories = NONE { $current.categories } else if type::is_array($payload.categories) { $payload.categories } else if $payload.categories = null || (type::is_string($payload.categories) && string::len(string::trim($payload.categories)) = 0) { $payload.categories } else { fn::ridParam("exam", $payload.categories) },
		categoryIds: if $payload.categoryIds = NONE { $current.categoryIds } else if type::is_array($payload.categoryIds) { $payload.categoryIds } else if $payload.categoryIds = null || (type::is_string($payload.categoryIds) && string::len(string::trim($payload.categoryIds)) = 0) { $payload.categoryIds } else { fn::ridParam("qt", $payload.categoryIds) },
	});

	let $payload = if !($payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0)) && (!type::is_record($payload.s) || !record::exists($payload.s)) {
		fn::objectAssign($payload, {
			s: NONE,
		})
	} else {
		$payload
	};
	if !($payload.q = NONE || $payload.q = null || (type::is_string($payload.q) && string::len(string::trim($payload.q)) = 0)) && (!type::is_record($payload.q) || !record::exists($payload.q)) {
		throw "updateQuestionAttempt | q must reference an existing q record";
	};
	if !($payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0)) && (!type::is_record($payload.u) || !record::exists($payload.u)) {
		throw "updateQuestionAttempt | u must reference an existing u record";
	};
	if !($payload.selectedOptionID = NONE || $payload.selectedOptionID = null || (type::is_string($payload.selectedOptionID) && string::len(string::trim($payload.selectedOptionID)) = 0)) && (!type::is_record($payload.selectedOptionID) || !record::exists($payload.selectedOptionID)) {
		throw "updateQuestionAttempt | selectedOptionID must reference an existing qo record";
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
		u: if type::is_array($rel_u) {
			$rel_u_norm
		} else if $rel_u {
			$rel_u
		} else {
			$payload.u
		}
	});

	let $rel_q_norm = fn::toRecordArray('q', $rel_q);
	let $payload = fn::objectAssign($payload, {
		q: if type::is_array($rel_q) {
			$rel_q_norm
		} else if $rel_q {
			$rel_q
		} else {
			$payload.q
		}
	});

	let $rel_s_norm = fn::toRecordArray('s', $rel_s);
	let $payload = fn::objectAssign($payload, {
		s: if type::is_array($rel_s) {
			$rel_s_norm
		} else if $rel_s {
			$rel_s
		} else {
			$payload.s
		}
	});

	let $rel_exams_norm = fn::toRecordArray('exam', $rel_exams);
	let $payload = fn::objectAssign($payload, {
		exams: if type::is_array($rel_exams) {
			$rel_exams_norm
		} else if $rel_exams {
			$rel_exams
		} else {
			$payload.exams
		}
	});

	let $rel_categoryIds_norm = fn::toRecordArray('qt', $rel_categoryIds);
	let $payload = fn::objectAssign($payload, {
		categoryIds: if type::is_array($rel_categoryIds) {
			$rel_categoryIds_norm
		} else if $rel_categoryIds {
			$rel_categoryIds
		} else {
			$payload.categoryIds
		}
	});


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

	if type::is_array($rel_u) {
	delete from UserAttempts where out = $rid;
		for $rel in $rel_u_norm {
			fn::createEdge($rel, "UserAttempts", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_u {
	delete from UserAttempts where out = $rid;
		for $rel in $rel_u_norm {
			fn::createEdge($rel, "UserAttempts", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_q) {
	delete from QuestionAttempts where out = $rid;
		for $rel in $rel_q_norm {
			fn::createEdge($rel, "QuestionAttempts", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_q {
	delete from QuestionAttempts where out = $rid;
		for $rel in $rel_q_norm {
			fn::createEdge($rel, "QuestionAttempts", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_s) {
	delete from SessionAttempts where out = $rid;
		for $rel in $rel_s_norm {
			fn::createEdge($rel, "SessionAttempts", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_s {
	delete from SessionAttempts where out = $rid;
		for $rel in $rel_s_norm {
			fn::createEdge($rel, "SessionAttempts", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_exams) {
	delete from ExamAttempts where out = $rid;
		for $rel in $rel_exams_norm {
			fn::createEdge($rel, "ExamAttempts", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_exams {
	delete from ExamAttempts where out = $rid;
		for $rel in $rel_exams_norm {
			fn::createEdge($rel, "ExamAttempts", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_categoryIds) {
	delete from TermAttempts where out = $rid;
		for $rel in $rel_categoryIds_norm {
			fn::createEdge($rel, "TermAttempts", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_categoryIds {
	delete from TermAttempts where out = $rid;
		for $rel in $rel_categoryIds_norm {
			fn::createEdge($rel, "TermAttempts", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateQuestionAttempt | failed to update QuestionAttempt";
	}

};
