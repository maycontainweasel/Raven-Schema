DEFINE FUNCTION OVERWRITE fn::deleteSession($SessionID: any) {

	let $rid = fn::ridParam("s", $SessionID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from SessionQuestions where in = $rid;
	delete from UserSessions where out = $rid;
	delete from ExamSessions where out = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteSession | failed to delete Session";
	}

};
