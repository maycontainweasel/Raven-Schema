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
	    ("") AS optionsString,
	    $this.instances || [] AS instances,
	    ([]) AS exams,
	    ([]) AS categories,
	    ([]) AS tags,
	    ([]) AS topics,
	    (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post
	FROM only $RID;
};
