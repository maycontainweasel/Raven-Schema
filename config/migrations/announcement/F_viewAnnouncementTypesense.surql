DEFINE FUNCTION OVERWRITE fn::viewAnnouncementTypesense($AnnouncementId: any) {

	let $RID = fn::ridParam("announcement", $AnnouncementId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewAnnouncementTypesense | expects valid $AnnouncementId record';
	};

	return SELECT
	    id,
	    title,
	    message,
	    style,
	    severity,
	    active,
	    instances,
	    (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post
	FROM only $RID;
};
