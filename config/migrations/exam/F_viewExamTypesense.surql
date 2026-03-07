DEFINE FUNCTION OVERWRITE fn::viewExamTypesense($ExamId: any) {

	let $RID = fn::ridParam("exam", $ExamId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewExamTypesense | expects valid $ExamId record';
	};

	return SELECT
	    key,
	    title,
	    titleShort,
	    college,
	    qidIndex,
	    instances,
	    (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post,
	    (<string> record::id($this.id)) AS id
	FROM only $RID;
};
