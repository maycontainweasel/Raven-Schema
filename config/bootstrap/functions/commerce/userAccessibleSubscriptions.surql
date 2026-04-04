DEFINE FUNCTION OVERWRITE fn::userAccessibleSubscriptions($UID: any) {
	let $UID = fn::ridParam("u", $UID);
	if !type::is_record($UID) || !record::exists($UID) {
		throw "userAccessibleSubscriptions | expects valid $UID";
	};

	fn::reconcileUserAccess($UID);

	return (
		select *,
			(<string> $this.id) as id,
			(<string> $this.create_datetime) as create_datetime,
			(<string> $this.expiry_datetime) as expiry_datetime,
			(<string> $this.last_updated) as last_updated,
			(<string> $this.start_datetime) as start_datetime
		from uSubscription
		where
			u = $UID
			and state != "revoked"
			and state != "expired"
			and expiry_datetime > time::now()
		order by expiry_datetime asc
		fetch exam
	);
};
