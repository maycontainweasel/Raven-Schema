DEFINE FUNCTION OVERWRITE fn::viewQuestionTypesense($QuestionId: any) {

	let $RID = fn::ridParam("q", $QuestionId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewQuestionTypesense | expects valid $QuestionId record';
	};

	return SELECT
	    question,
	    explanation,
	    source,
	    ("") AS optionsString,
	    $this.instances || [] AS instances,
	    qid,
	    ([]) AS exams,
	    ([]) AS categories,
	    ([]) AS tags,
	    ([]) AS topics,
	    ({
status: "",
createdAt: "",
updatedAt: "",
}) AS post,
	    (<string> record::id($this.id)) AS id
	FROM only $RID;
};
