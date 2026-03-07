DEFINE FUNCTION OVERWRITE fn::viewNotificationTypesense($NotificationId: any) {

	let $RID = fn::ridParam("notification", $NotificationId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewNotificationTypesense | expects valid $NotificationId record';
	};

	return SELECT
	    id,
	    title,
	    summary,
	    body,
	    publishAt,
	    order,
	    active,
	    instances,
	    (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post
	FROM only $RID;
};
