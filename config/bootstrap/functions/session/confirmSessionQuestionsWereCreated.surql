DEFINE FUNCTION OVERWRITE fn::confirmSessionQuestionsWereCreated($SID: record) {
	if !type::is_record($SID) || !record::exists($SID) {
		throw "confirmSessionQuestionsWereCreated | expects a valid session record";
	};

	let $QIDS = select value qids from only $SID;
	let $Q_TOTAL = select value qTotal from only $SID;

	if !type::is_array($QIDS) {
		throw "confirmSessionQuestionsWereCreated | session qids is invalid";
	};

	let $SQ_QIDS = select value out from SessionQuestions where in = $SID;
	let $QUESTION_COUNT = array::len($SQ_QIDS);

	return if $QUESTION_COUNT = $Q_TOTAL {
		update only $SID set
			qidsInit = true,
			qids = [];

		return {
			success: true,
			qids: []
		};
	} else {
		return {
			success: false,
			qids: array::difference($QIDS, $SQ_QIDS)
		};
	};
};
