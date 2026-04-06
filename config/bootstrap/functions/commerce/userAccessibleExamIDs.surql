DEFINE FUNCTION OVERWRITE fn::userAccessibleExamIDs($UID: any) {
	let $UID = fn::ridParam("u", $UID);
	if !type::is_record($UID) || !record::exists($UID) {
		throw "userAccessibleExamIDs | expects valid $UID";
	};

	fn::reconcileUserAccess($UID);

	let $rows = (
		select * from uSubscription
		where
			u = $UID
			and state != "revoked"
			and state != "expired"
			and expiry_datetime > time::now()
		order by expiry_datetime asc
	);

	return array::map($rows, |$row| {
		$row.exam
	});
};
