DEFINE FUNCTION OVERWRITE fn::viewSessionAdmin($SessionId: any) {

	let $RID = fn::ridParam("s", $SessionId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewSessionAdmin | expects valid $SessionId record';
	};

	return SELECT
	    id,
	    title,
	    mode,
	    state,
	    active,
	    dateCreated,
	    dateLastActive,
	    dateLastTouch,
	    dateCompleted,
	    index,
	    qTotal,
	    familiarity,
	    qids,
	    qidsInit,
	    qActiveID,
	    (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post,
	    u,
	    exams,
	    categories,
	    timing
	FROM only $RID;
};
