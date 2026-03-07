DEFINE FUNCTION OVERWRITE fn::createSession($payload: object) {

	if !$payload {
		throw "createSession | payload is required";
	};

	let $subtable_sessionPerformanceRecord = $payload.sessionPerformanceRecord;
	let $subtable_sessionCategoryRecord = $payload.sessionCategoryRecord;
	let $subtable_sessionEvent = $payload.sessionEvent;

	let $payload = fn::objectRemove($payload, ["dateLastActive", "dateLastTouch", "dateCompleted", "qActiveID"]);

	let $payload = fn::objectRemove($payload, ["sessionPerformanceRecord", "sessionCategoryRecord", "sessionEvent"]);

	if $payload.title = NONE || $payload.title = null || (type::is_string($payload.title) && string::len($payload.title) = 0) {
		throw "createSession | requires title";
	};
	if $payload.mode = NONE || $payload.mode = null || (type::is_string($payload.mode) && string::len($payload.mode) = 0) {
		throw "createSession | requires mode";
	};
	if $payload.state = NONE || $payload.state = null || (type::is_string($payload.state) && string::len($payload.state) = 0) {
		throw "createSession | requires state";
	};
	if $payload.active = NONE || $payload.active = null || (type::is_string($payload.active) && string::len($payload.active) = 0) {
		throw "createSession | requires active";
	};
	if $payload.dateCreated = NONE || $payload.dateCreated = null || (type::is_string($payload.dateCreated) && string::len($payload.dateCreated) = 0) {
		throw "createSession | requires dateCreated";
	};
	if $payload.qTotal = NONE || $payload.qTotal = null || (type::is_string($payload.qTotal) && string::len($payload.qTotal) = 0) {
		throw "createSession | requires qTotal";
	};
	if $payload.familiarity = NONE || $payload.familiarity = null || (type::is_string($payload.familiarity) && string::len($payload.familiarity) = 0) {
		throw "createSession | requires familiarity";
	};
	if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len($payload.u) = 0) {
		throw "createSession | requires u";
	};

	if !($payload.mode IN ["learn", "exam"]) {
		throw "createSession | invalid mode";
	};
	if !($payload.state IN ["untouched", "in-progress", "paused", "complete"]) {
		throw "createSession | invalid state";
	};
	if !($payload.familiarity IN ["all", "new", "incorrect"]) {
		throw "createSession | invalid familiarity";
	};

	let $defaultData = {
		title: "New Session",
		mode: "learn",
		state: "untouched",
		active: true,
		dateCreated: "",
		dateLastActive: "",
		dateLastTouch: "",
		dateCompleted: "",
		index: 0,
		qTotal: 0,
		familiarity: "all",
		u: "",
		exams: type::record("exam", []),
		categories: type::record("exam", []),
		timing: {},
		qids: type::record("q", []),
		qidsInit: false,
		qActiveID: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		u: if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { null } else { fn::ridParam("u", $payload.u) },
	});

	let $payload = fn::objectAssign($payload, {
		u: if type::is_array($payload.u) { $payload.u } else if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { $payload.u } else { fn::ridParam("u", $payload.u) },
		exams: if type::is_array($payload.exams) { $payload.exams } else if $payload.exams = NONE || $payload.exams = null || (type::is_string($payload.exams) && string::len(string::trim($payload.exams)) = 0) { $payload.exams } else { fn::ridParam("exam", $payload.exams) },
		categories: if type::is_array($payload.categories) { $payload.categories } else if $payload.categories = NONE || $payload.categories = null || (type::is_string($payload.categories) && string::len(string::trim($payload.categories)) = 0) { $payload.categories } else { fn::ridParam("exam", $payload.categories) },
		qids: if type::is_array($payload.qids) { $payload.qids } else if $payload.qids = NONE || $payload.qids = null || (type::is_string($payload.qids) && string::len(string::trim($payload.qids)) = 0) { $payload.qids } else { fn::ridParam("q", $payload.qids) },
		qActiveID: if type::is_array($payload.qActiveID) { $payload.qActiveID } else if $payload.qActiveID = NONE || $payload.qActiveID = null || (type::is_string($payload.qActiveID) && string::len(string::trim($payload.qActiveID)) = 0) { $payload.qActiveID } else { fn::ridParam("q", $payload.qActiveID) },
	});

	if !($payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0)) && (!type::is_record($payload.u) || !record::exists($payload.u)) {
		throw "createSession | u must reference an existing u record";
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

	let $rel_questions = $payload.questions;
	let $rel_sessions = $payload.sessions;
	let $rel_sessions = $payload.sessions;

	let $payload = fn::objectRemove($payload, ["questions", "sessions", "sessions"]);

	let $rel_questions_norm = fn::toRecordArray('s', $rel_questions);
	let $rel_sessions_norm = fn::toRecordArray('u', $rel_sessions);
	let $rel_sessions_norm = fn::toRecordArray('exam', $rel_sessions);

	let $record = upsert s content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createSession | failed to create s";
	};

	if type::is_array($rel_questions_norm) {
		for $rel in $rel_questions_norm {
			fn::createEdge($rel, "SessionQuestions", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_questions {
		for $rel in $rel_questions_norm {
			fn::createEdge($rel, "SessionQuestions", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_sessions_norm) {
		for $rel in $rel_sessions_norm {
			fn::createEdge($rel, "UserSessions", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_sessions {
		for $rel in $rel_sessions_norm {
			fn::createEdge($rel, "UserSessions", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_sessions_norm) {
		for $rel in $rel_sessions_norm {
			fn::createEdge($rel, "ExamSessions", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_sessions {
		for $rel in $rel_sessions_norm {
			fn::createEdge($rel, "ExamSessions", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	if type::is_array($subtable_sessionPerformanceRecord) {
		if array::len($subtable_sessionPerformanceRecord) > 0 {
			let $subtable_item_sessionPerformanceRecord_spr = array::first($subtable_sessionPerformanceRecord);
			let $subtable_payload_sessionPerformanceRecord_spr = if type::is_object($subtable_item_sessionPerformanceRecord_spr) { $subtable_item_sessionPerformanceRecord_spr } else if $subtable_item_sessionPerformanceRecord_spr = NONE || $subtable_item_sessionPerformanceRecord_spr = null { {} } else { { qTotal: $subtable_item_sessionPerformanceRecord_spr } };
			fn::createSessionPerformanceRecord($recordID, fn::objectAssign($subtable_payload_sessionPerformanceRecord_spr, { skipExists: true }));
		} else if true {
			fn::createSessionPerformanceRecord($recordID, { skipExists: true });
		};
	} else if type::is_object($subtable_sessionPerformanceRecord) || $subtable_sessionPerformanceRecord {
		let $subtable_payload_sessionPerformanceRecord_spr = if type::is_object($subtable_sessionPerformanceRecord) { $subtable_sessionPerformanceRecord } else if $subtable_sessionPerformanceRecord = NONE || $subtable_sessionPerformanceRecord = null { {} } else { { qTotal: $subtable_sessionPerformanceRecord } };
		fn::createSessionPerformanceRecord($recordID, fn::objectAssign($subtable_payload_sessionPerformanceRecord_spr, { skipExists: true }));
	} else if true {
		fn::createSessionPerformanceRecord($recordID, { skipExists: true });
	};

	if type::is_array($subtable_sessionCategoryRecord) {
		let $subtable_index_sessionCategoryRecord_scr = 0;
		for $subtable_item_sessionCategoryRecord_scr in $subtable_sessionCategoryRecord {
			let $subtable_payload_sessionCategoryRecord_scr = if type::is_object($subtable_item_sessionCategoryRecord_scr) { $subtable_item_sessionCategoryRecord_scr } else if $subtable_item_sessionCategoryRecord_scr = NONE || $subtable_item_sessionCategoryRecord_scr = null { {} } else { { attempts: $subtable_item_sessionCategoryRecord_scr } };
			let $subtable_payload_sessionCategoryRecord_scr = if $subtable_payload_sessionCategoryRecord_scr.order = NONE {
				fn::objectAssign($subtable_payload_sessionCategoryRecord_scr, { order: $subtable_index_sessionCategoryRecord_scr })
			} else {
				$subtable_payload_sessionCategoryRecord_scr
			};
			fn::createSessionCategoryRecord($recordID, fn::objectAssign($subtable_payload_sessionCategoryRecord_scr, { skipExists: true }));
			let $subtable_index_sessionCategoryRecord_scr = $subtable_index_sessionCategoryRecord_scr + 1;
		};
	} else if type::is_object($subtable_sessionCategoryRecord) || $subtable_sessionCategoryRecord {
		let $subtable_payload_sessionCategoryRecord_scr = if type::is_object($subtable_sessionCategoryRecord) { $subtable_sessionCategoryRecord } else if $subtable_sessionCategoryRecord = NONE || $subtable_sessionCategoryRecord = null { {} } else { { attempts: $subtable_sessionCategoryRecord } };
		let $subtable_payload_sessionCategoryRecord_scr = if $subtable_payload_sessionCategoryRecord_scr.order = NONE {
			fn::objectAssign($subtable_payload_sessionCategoryRecord_scr, { order: 0 })
		} else {
			$subtable_payload_sessionCategoryRecord_scr
		};
		fn::createSessionCategoryRecord($recordID, fn::objectAssign($subtable_payload_sessionCategoryRecord_scr, { skipExists: true }));
	};

	if type::is_array($subtable_sessionEvent) {
		if array::len($subtable_sessionEvent) > 0 {
			let $subtable_item_sessionEvent_se = array::first($subtable_sessionEvent);
			let $subtable_payload_sessionEvent_se = if type::is_object($subtable_item_sessionEvent_se) { $subtable_item_sessionEvent_se } else if $subtable_item_sessionEvent_se = NONE || $subtable_item_sessionEvent_se = null { {} } else { { action: $subtable_item_sessionEvent_se } };
			fn::createSessionEvent($recordID, fn::objectAssign($subtable_payload_sessionEvent_se, { skipExists: true }));
		} else if true {
			fn::createSessionEvent($recordID, { skipExists: true });
		};
	} else if type::is_object($subtable_sessionEvent) || $subtable_sessionEvent {
		let $subtable_payload_sessionEvent_se = if type::is_object($subtable_sessionEvent) { $subtable_sessionEvent } else if $subtable_sessionEvent = NONE || $subtable_sessionEvent = null { {} } else { { action: $subtable_sessionEvent } };
		fn::createSessionEvent($recordID, fn::objectAssign($subtable_payload_sessionEvent_se, { skipExists: true }));
	} else if true {
		fn::createSessionEvent($recordID, { skipExists: true });
	};


	return if $record {
		return $record;
	} else {
		throw "createSession | failed to create s";
	}

};

