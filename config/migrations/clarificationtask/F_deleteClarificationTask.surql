DEFINE FUNCTION OVERWRITE fn::deleteClarificationTask($ClarificationTaskID: any) {

	let $rid = fn::ridParam("clarificationTask", $ClarificationTaskID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteClarificationTask | failed to delete ClarificationTask";
	}

};
