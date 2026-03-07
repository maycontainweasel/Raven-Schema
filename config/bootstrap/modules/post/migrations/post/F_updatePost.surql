DEFINE FUNCTION OVERWRITE fn::updatePost($PostID: any, $payload: object) {

	let $RID = fn::ridParam("p", $PostID);
	let $rid = if type::is_record($RID) && record::tb($RID) == "p" { $RID } else { fn::PID($RID) };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updatePost | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $result = update $rid merge $payload;
	let $result = if type::is_array($result) { array::first($result) } else { $result };

	return if $result {
		return $result;
	} else {
		throw "updatePost | failed to update Post";
	}

};
