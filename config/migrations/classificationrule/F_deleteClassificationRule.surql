DEFINE FUNCTION OVERWRITE fn::deleteClassificationRule($ClassificationRuleID: any) {

	let $rid = fn::ridParam("classificationRule", $ClassificationRuleID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteClassificationRule | failed to delete ClassificationRule";
	}

};
