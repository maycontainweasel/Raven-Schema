DEFINE FUNCTION OVERWRITE fn::deleteSessionPerformanceRecord($SessionPerformanceRecordID: any) {

	let $rid = fn::ridParam("spr", $SessionPerformanceRecordID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "s" { type::record("spr", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from SessionRecord where out = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteSessionPerformanceRecord | failed to delete SessionPerformanceRecord";
	}

};
