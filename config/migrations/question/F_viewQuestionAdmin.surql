DEFINE FUNCTION OVERWRITE fn::viewQuestionAdmin($QuestionId: any) {

	let $RID = fn::ridParam("q", $QuestionId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewQuestionAdmin | expects valid $QuestionId record';
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
	    testobject
	FROM only $RID;
};
