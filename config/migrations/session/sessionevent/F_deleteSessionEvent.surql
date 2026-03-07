DEFINE FUNCTION OVERWRITE fn::deleteSessionEvent($SessionEventID: any) {

	let $rid = fn::ridParam("se", $SessionEventID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "s" { type::record("se", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteSessionEvent | failed to delete SessionEvent";
	}

};
