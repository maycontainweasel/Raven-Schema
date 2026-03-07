DEFINE FUNCTION OVERWRITE fn::viewFAQTypesense($FAQId: any) {

	let $RID = fn::ridParam("faq", $FAQId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewFAQTypesense | expects valid $FAQId record';
	};

	return SELECT
	    id,
	    question,
	    answer,
	    category,
	    instances,
	    (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post
	FROM only $RID;
};
