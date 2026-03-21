DEFINE FUNCTION OVERWRITE fn::deletePost($PostID: any) {

	let $RID = fn::ridParam("p", $PostID);
	let $rid = if type::is_record($RID) && record::tb($RID) == "p" { $RID } else { fn::PID($RID) };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	delete from Post where in = $rid;
	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deletePost | failed to delete Post";
	}

};
