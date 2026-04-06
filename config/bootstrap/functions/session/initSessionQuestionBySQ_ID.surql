DEFINE FUNCTION OVERWRITE fn::initSessionQuestionBySQ_ID($SQ_ID: record) {
	if !type::is_record($SQ_ID) || !record::exists($SQ_ID) {
		throw "initSessionQuestionBySQ_ID | expects a valid SessionQuestions record";
	};

	let $SQ = select * from only $SQ_ID;
	let $QID = $SQ.out;

	if !type::is_record($QID) || !record::exists($QID) {
		throw "initSessionQuestionBySQ_ID | linked question not found";
	};

	let $QUESTION = select * from only $QID;

	let $TERM_IDS = (
		select value out
		from QuestionCategories
		where in = $QID
	);

	let $TERMS = (
		select value {
			id: $this.id,
			label: $this.label || $this.key || "",
			slug: $this.key || record::id($this.id),
			description: $this.description || "",
			isParent: if $this.parent && $this.parent != NONE { true } else { false }
		}
		from $TERM_IDS
	);

	let $OPTIONS = (
		select value {
			id: type::thing("qo", [$QID, $this.optionKey]),
			q: $QID,
			qid: <int> ($QUESTION.qid || 0),
			label: $this.label || "",
			order: <int> ($this.order || 0),
			correct: <bool> ($this.correct || false)
		}
		from qOption
		where <-(QuestionOption where in = $QID)
		order by order
	);

	let $CORRECT_OPTION = array::first(
		select value $this from $OPTIONS where correct = true
	);

	return {
		sq: $SQ_ID,
		in: $SQ.in,
		out: $QID,
		id: $QID,
		qid: <int> ($QUESTION.qid || 0),
		qIndex: <int> ($QUESTION.qid || 0),
		question: $QUESTION.question || "",
		explanation: $QUESTION.explanation || "",
		explanation_ref: $QUESTION.explanationRef || "",
		sheetid: $QUESTION.sheetId || "",
		source: $QUESTION.source || "",
		available: true,
		order: <int> ($SQ.order || 0),
		complete: <bool> ($SQ.complete || false),
		correct: false,
		totalTime: <int> ($SQ.totalTime || 0),
		lastUpdated: $SQ.lastUpdated || NONE,
		startTS: $SQ.startTS || NONE,
		answerTS: $SQ.answerTS || NONE,
		terms: $TERMS,
		options: $OPTIONS,
		correctOption: $CORRECT_OPTION
	};
};
