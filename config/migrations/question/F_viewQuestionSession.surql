DEFINE FUNCTION OVERWRITE fn::viewQuestionSession($QuestionId: any) {

	let $RID = fn::ridParam("q", $QuestionId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewQuestionSession | expects valid $QuestionId record';
	};

	return SELECT
	    id,
	    qid,
	    qCode,
	    question,
	    explanation,
	    explanationRef,
	    source,
	    instances,
	    (select id, label, correct, order from qOption where <-(QuestionOption where in = $parent.id)) AS options
	FROM only $RID;
};
