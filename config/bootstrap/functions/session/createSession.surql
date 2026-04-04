DEFINE FUNCTION OVERWRITE fn::createSession($payload: object, $UID: record, $QIDS: option<array | bool>) {
	if !$payload || !type::is_object($payload) {
		throw "createSession | payload object is required";
	};
	if !type::is_record($UID) || !record::exists($UID) {
		throw "createSession | expects a valid user record";
	};

	if !type::is_array($payload.exams) || array::len($payload.exams) = 0 {
		throw "createSession | at least one exam is required";
	};

	let $TITLE = if $payload.title && $payload.title != "" {
		return <string> $payload.title;
	} else {
		return <string> time::now();
	};

	let $MODE = if $payload.mode = "exam" {
		return "exam";
	} else {
		return "learn";
	};

	let $FAM_MODE = if $payload.familiarity = "new" || $payload.familiarity = "incorrect" {
		return <string> $payload.familiarity;
	} else {
		return "all";
	};

	let $EXAMS = $payload.exams.map(|$exam| {
		return {
			id: fn::ridParam("exam", $exam.id),
			terms: if type::is_array($exam.terms) {
				return $exam.terms.map(|$term| fn::ridParam("t_q_qcat", $term)).filter(|$term| type::is_record($term));
			} else {
				return [];
			}
		};
	}).filter(|$exam| type::is_record($exam.id));

	if array::len($EXAMS) = 0 {
		throw "createSession | no valid exams found in payload";
	};

	let $QID_LIST = if type::is_array($QIDS) {
		return array::distinct(
			$QIDS
				.map(|$qid| fn::ridParam("q", $qid))
				.filter(|$qid| type::is_record($qid))
		);
	} else {
		return [];
	};

	if array::len($QID_LIST) = 0 {
		throw "createSession | pre-sourced QIDS are required for this compatibility path";
	};

	let $Q_TOTAL = if type::is_number($payload.qTotal) && $payload.qTotal > 0 {
		return <int> $payload.qTotal;
	} else {
		return <int> array::len($QID_LIST);
	};

	let $TIMING = if type::is_object($payload.timing) {
		return $payload.timing;
	} else if $MODE = "exam" && type::is_number($payload.timePerQuestion) {
		return {
			timePerQuestion: <int> $payload.timePerQuestion,
			totalTime: <int> ($Q_TOTAL * $payload.timePerQuestion)
		};
	} else {
		return {
			timePerQuestion: 0,
			totalTime: 0
		};
	};

	let $EXAM_IDS = $EXAMS.map(|$exam| $exam.id);
	let $FIRST_QID = array::first($QID_LIST);

	let $SID = select value id from only (
		create only s content {
			title: $TITLE,
			uuid: <string> rand::uuid(),
			dateCreated: time::now(),
			dateLastActive: time::now(),
			dateLastTouch: time::now(),
			dateCompleted: NONE,
			state: "untouched",
			active: true,
			u: $UID,
			index: 0,
			mode: $MODE,
			qTotal: $Q_TOTAL,
			exams: $EXAM_IDS,
			categories: $EXAMS,
			terms: $EXAMS,
			familiarity: $FAM_MODE,
			timing: $TIMING,
			qids: $QID_LIST,
			qidsInit: false,
			qActiveID: $FIRST_QID
		}
	);

	if !type::is_record($SID) {
		throw "createSession | failed to create session record";
	};

	if type::is_record($FIRST_QID) {
		let $REL = (select * from SessionQuestions where in = $SID and out = $FIRST_QID);
		if !type::is_array($REL) || array::len($REL) = 0 {
			relate only $SID->SessionQuestions->$FIRST_QID set
				id = type::record("SessionQuestions", [$SID, $FIRST_QID]),
				s = $SID,
				q = $FIRST_QID,
				order = 0,
				flagged = false,
				complete = false,
				totalTime = 0,
				lastUpdated = time::now();
		};
	};

	let $USER_REL = (select * from UserSessions where in = $UID and out = $SID);
	if !type::is_array($USER_REL) || array::len($USER_REL) = 0 {
		relate only $UID->UserSessions->$SID set id = type::thing("UserSessions", [$UID, $SID]);
	};

	for $EXAM_ID in $EXAM_IDS {
		let $EXAM_REL = (select * from ExamSessions where in = $EXAM_ID and out = $SID);
		if !type::is_array($EXAM_REL) || array::len($EXAM_REL) = 0 {
			relate only $EXAM_ID->ExamSessions->$SID set id = type::thing("ExamSessions", [$EXAM_ID, $SID]);
		};
	};

	let $SPR_ID = select value id from only (
		upsert only type::thing("spr", $SID) merge {
			s: $SID,
			u: $UID,
			qTotal: $Q_TOTAL,
			attempts: 0,
			noCorrect: 0,
			noIncorrect: 0,
			noComplete: 0,
			noIncomplete: $Q_TOTAL,
			percComplete: 0,
			percCorrect: 0,
			percCorrectAttempted: 0,
			totalSessionTime: 0,
			averageTimePerQ: 0
		}
	);

	let $RECORD_REL = (select * from SessionRecord where in = $SID and out = $SPR_ID);
	if !type::is_array($RECORD_REL) || array::len($RECORD_REL) = 0 {
		relate only $SID->SessionRecord->$SPR_ID set id = type::thing("SessionRecord", [$SID, $SPR_ID]);
	};

	let $SLOG_ID = select value id from only (
		upsert only type::thing("slog", $SID) merge {
			s: $SID,
			total: 0
		}
	);

	let $LOG_REL = (select * from SessionLog where in = $SID and out = $SLOG_ID);
	if !type::is_array($LOG_REL) || array::len($LOG_REL) = 0 {
		relate only $SID->SessionLog->$SLOG_ID set id = type::thing("SessionLog", [$SID, $SLOG_ID]);
	};

	return select id, (<string> $this.uuid) as uuid from only $SID;
};
