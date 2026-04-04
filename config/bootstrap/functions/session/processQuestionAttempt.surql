DEFINE FUNCTION OVERWRITE fn::processQuestionAttempt($payload: object) {
	if !$payload || !type::is_object($payload) {
		throw "processQuestionAttempt | payload object is required";
	};

	let $SID = fn::ridParam("s", $payload.SID);
	if !type::is_record($SID) || !record::exists($SID) {
		throw "processQuestionAttempt | expects a valid session record";
	};

	let $QID = fn::ridParam("q", $payload.QID);
	if !type::is_record($QID) || !record::exists($QID) {
		throw "processQuestionAttempt | expects a valid question record";
	};

	let $QOPT_ID = fn::ridParam("qo", $payload.QOPT_ID);
	if !type::is_record($QOPT_ID) {
		throw "processQuestionAttempt | expects a valid question option identifier";
	};

	let $ANSWER_TS = if $payload.ANSWER_TS { $payload.ANSWER_TS } else { time::now() };
	let $ORDER = if type::is_number($payload.ORDER) && $payload.ORDER >= 0 {
		return <int> $payload.ORDER;
	} else {
		return 0;
	};
	let $_RECONCILIATION_KEY = if $payload._reconciliationKey {
		return <string> $payload._reconciliationKey;
	} else {
		return "";
	};

	let $UID = select value u from only $SID;
	if !type::is_record($UID) || !record::exists($UID) {
		throw "processQuestionAttempt | session user not found";
	};

	let $OPTION_ID_PARTS = record::id($QOPT_ID);
	let $OPTION_KEY = if type::is_array($OPTION_ID_PARTS) && array::len($OPTION_ID_PARTS) > 1 {
		return <string> $OPTION_ID_PARTS[1];
	} else {
		return <string> $OPTION_ID_PARTS;
	};

	let $QOPTION = array::first(
		select *
		from qOption
		where optionKey = $OPTION_KEY
			and <-(QuestionOption where in = $QID)
	);

	if !$QOPTION || !type::is_record($QOPTION.id) {
		throw "processQuestionAttempt | question option not found for question";
	};

	let $SELECTED_OPTION_ID = type::thing("qo", [$QID, $OPTION_KEY]);
	let $CORRECT = <bool> ($QOPTION.correct || false);

	let $QUESTION_EXAM_IDS = (
		select value in
		from ExamQuestions
		where out = $QID
	);

	let $QUESTION_TERM_IDS = (
		select value out
		from QuestionCategories
		where in = $QID
	);

	let $EXAM_TERMS = (
		select value {
			exam: $this,
			terms: (
				select value out
				from QuestionCategories
				where in = $QID
					and out in (select value out from ExamQuestionCategories where in = $parent.this)
			)
		}
		from $QUESTION_EXAM_IDS
	);

	let $SQ_ID = type::thing("SessionQuestions", [$SID, $QID]);
	let $SQ = select * from only $SQ_ID;
	let $SQ_TOTAL_TIME = if $SQ && type::is_number($SQ.totalTime) {
		return <int> $SQ.totalTime;
	} else {
		return 0;
	};

	let $QA_ID = select value id from only (
		upsert only type::thing("qa", [$SID, $QID, $ORDER]) merge {
			create_at: time::now(),
			s: $SID,
			q: $QID,
			u: $UID,
			exams: $QUESTION_EXAM_IDS,
			examsTerms: $EXAM_TERMS,
			answerTS: $ANSWER_TS,
			selectedOptionID: $SELECTED_OPTION_ID,
			correct: $CORRECT,
			order: $ORDER,
			totalTime: $SQ_TOTAL_TIME,
			_reconciliationKey: $_RECONCILIATION_KEY
		}
	);

	let $EXISTING_QA = select * from only $QA_ID;

	for $EXAM_ID in $QUESTION_EXAM_IDS {
		let $REL = (select * from ExamAttempts where in = $EXAM_ID and out = $QA_ID);
		if !type::is_array($REL) || array::len($REL) = 0 {
			relate only $EXAM_ID->ExamAttempts->$QA_ID;
		};
	};

	let $QUESTION_REL = (select * from QuestionAttempts where in = $QID and out = $QA_ID);
	if !type::is_array($QUESTION_REL) || array::len($QUESTION_REL) = 0 {
		relate only $QID->QuestionAttempts->$QA_ID;
	};

	let $USER_REL = (select * from UserAttempts where in = $UID and out = $QA_ID);
	if !type::is_array($USER_REL) || array::len($USER_REL) = 0 {
		relate only $UID->UserAttempts->$QA_ID;
	};

	let $SESSION_REL = (select * from SessionAttempts where in = $SID and out = $QA_ID);
	if !type::is_array($SESSION_REL) || array::len($SESSION_REL) = 0 {
		relate only $SID->SessionAttempts->$QA_ID;
	};

	update only $SQ_ID merge {
		complete: true,
		answerTS: $ANSWER_TS,
		lastUpdated: time::now()
	};

	let $QPR_ID = type::thing("qpr", $QID);
	let $CURRENT_QPR = select * from only $QPR_ID;
	let $QPR_ATTEMPTS = <int> (($CURRENT_QPR.attempts || 0) + 1);
	let $QPR_CORRECT = <int> (($CURRENT_QPR.noCorrect || 0) + (if $CORRECT { 1 } else { 0 }));
	let $QPR_INCORRECT = <int> (($CURRENT_QPR.noIncorrect || 0) + (if $CORRECT { 0 } else { 1 }));
	let $QPR_TOTAL_TIME = <int> (($CURRENT_QPR.totalTime || 0) + $SQ_TOTAL_TIME);
	upsert only $QPR_ID merge {
		attempts: $QPR_ATTEMPTS,
		noCorrect: $QPR_CORRECT,
		noIncorrect: $QPR_INCORRECT,
		percCorrect: if $QPR_ATTEMPTS > 0 { math::round(($QPR_CORRECT / $QPR_ATTEMPTS) * 100) } else { 0 },
		totalTime: $QPR_TOTAL_TIME,
		averageTime: if $QPR_ATTEMPTS > 0 { math::round($QPR_TOTAL_TIME / $QPR_ATTEMPTS) } else { 0 }
	};

	let $UQPR_ID = type::thing("uqpr", [$UID, $QID]);
	let $CURRENT_UQPR = select * from only $UQPR_ID;
	let $UQPR_ATTEMPTS = <int> (($CURRENT_UQPR.attempts || 0) + 1);
	let $UQPR_CORRECT = <int> (($CURRENT_UQPR.noCorrect || 0) + (if $CORRECT { 1 } else { 0 }));
	let $UQPR_INCORRECT = <int> (($CURRENT_UQPR.noIncorrect || 0) + (if $CORRECT { 0 } else { 1 }));
	let $UQPR_TOTAL_TIME = <int> (($CURRENT_UQPR.totalTime || 0) + $SQ_TOTAL_TIME);
	upsert only $UQPR_ID merge {
		attempts: $UQPR_ATTEMPTS,
		noCorrect: $UQPR_CORRECT,
		noIncorrect: $UQPR_INCORRECT,
		percCorrect: if $UQPR_ATTEMPTS > 0 { math::round(($UQPR_CORRECT / $UQPR_ATTEMPTS) * 100) } else { 0 },
		totalTime: $UQPR_TOTAL_TIME,
		averageTime: if $UQPR_ATTEMPTS > 0 { math::round($UQPR_TOTAL_TIME / $UQPR_ATTEMPTS) } else { 0 },
		order: $ORDER
	};

	let $QOR_ID = type::thing("qor", [$QID, $QOPTION.id]);
	let $CURRENT_QOR = select * from only $QOR_ID;
	let $QOR_ATTEMPTS = <int> (($CURRENT_QOR.attempts || 0) + 1);
	let $QOR_CORRECT = <int> (($CURRENT_QOR.noCorrect || 0) + (if $CORRECT { 1 } else { 0 }));
	let $QOR_INCORRECT = <int> (($CURRENT_QOR.noIncorrect || 0) + (if $CORRECT { 0 } else { 1 }));
	upsert only $QOR_ID merge {
		q: $QID,
		qOption: $QOPTION.id,
		attempts: $QOR_ATTEMPTS,
		noCorrect: $QOR_CORRECT,
		noIncorrect: $QOR_INCORRECT,
		percCorrect: if $QOR_ATTEMPTS > 0 { math::round(($QOR_CORRECT / $QOR_ATTEMPTS) * 100) } else { 0 }
	};

	let $UQOR_ID = type::thing("uqor", [$UID, $QOPTION.id]);
	let $CURRENT_UQOR = select * from only $UQOR_ID;
	let $UQOR_ATTEMPTS = <int> (($CURRENT_UQOR.attempts || 0) + 1);
	let $UQOR_CORRECT = <int> (($CURRENT_UQOR.correct || 0) + (if $CORRECT { 1 } else { 0 }));
	let $UQOR_INCORRECT = <int> (($CURRENT_UQOR.incorrect || 0) + (if $CORRECT { 0 } else { 1 }));
	upsert only $UQOR_ID merge {
		u: $UID,
		qOption: $QOPTION.id,
		attempts: $UQOR_ATTEMPTS,
		correct: $UQOR_CORRECT,
		incorrect: $UQOR_INCORRECT,
		percCorrect: if $UQOR_ATTEMPTS > 0 { math::round(($UQOR_CORRECT / $UQOR_ATTEMPTS) * 100) } else { 0 },
		order: $ORDER
	};

	let $SPR_ID = type::thing("spr", $SID);
	let $CURRENT_SPR = select * from only $SPR_ID;
	let $SPR_ATTEMPTS = <int> (($CURRENT_SPR.attempts || 0) + 1);
	let $SPR_CORRECT = <int> (($CURRENT_SPR.noCorrect || 0) + (if $CORRECT { 1 } else { 0 }));
	let $SPR_INCORRECT = <int> (($CURRENT_SPR.noIncorrect || 0) + (if $CORRECT { 0 } else { 1 }));
	let $SPR_QTOTAL = <int> ($CURRENT_SPR.qTotal || 0);
	let $SPR_TOTAL_TIME = <int> ($CURRENT_SPR.totalSessionTime || 0);
	upsert only $SPR_ID merge {
		s: $SID,
		u: $UID,
		qTotal: $SPR_QTOTAL,
		attempts: $SPR_ATTEMPTS,
		noCorrect: $SPR_CORRECT,
		noIncorrect: $SPR_INCORRECT,
		noComplete: $SPR_ATTEMPTS,
		noIncomplete: if $SPR_QTOTAL > $SPR_ATTEMPTS { $SPR_QTOTAL - $SPR_ATTEMPTS } else { 0 },
		percComplete: if $SPR_QTOTAL > 0 { math::round(($SPR_ATTEMPTS / $SPR_QTOTAL) * 100) } else { 0 },
		percCorrect: if $SPR_QTOTAL > 0 { math::round(($SPR_CORRECT / $SPR_QTOTAL) * 100) } else { 0 },
		percCorrectAttempted: if $SPR_ATTEMPTS > 0 { math::round(($SPR_CORRECT / $SPR_ATTEMPTS) * 100) } else { 0 },
		totalSessionTime: $SPR_TOTAL_TIME,
		averageTimePerQ: if $SPR_ATTEMPTS > 0 { math::round($SPR_TOTAL_TIME / $SPR_ATTEMPTS) } else { 0 }
	};

	return {
		id: $QA_ID,
		s: $SID,
		q: $QID,
		u: $UID,
		exams: $QUESTION_EXAM_IDS,
		examsTerms: $EXAM_TERMS,
		answerTS: $ANSWER_TS,
		selectedOptionID: $SELECTED_OPTION_ID,
		selectedOptionIDHash: $OPTION_KEY,
		correct: $CORRECT,
		order: $ORDER,
		totalTime: $SQ_TOTAL_TIME,
		_reconciliationKey: $_RECONCILIATION_KEY,
		sid: <string> $SID,
		qid: <string> $QID,
		uid: <string> $UID,
		qo: <string> $SELECTED_OPTION_ID
	};
};
