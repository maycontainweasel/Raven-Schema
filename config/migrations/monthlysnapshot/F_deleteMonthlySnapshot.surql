DEFINE FUNCTION OVERWRITE fn::deleteMonthlySnapshot($MonthlySnapshotID: any) {

	let $rid = fn::ridParam("monthlySnapshot", $MonthlySnapshotID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteMonthlySnapshot | failed to delete MonthlySnapshot";
	}

};
