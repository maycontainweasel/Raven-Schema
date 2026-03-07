DEFINE FUNCTION OVERWRITE fn::deleteInstanceSettings($InstanceSettingsID: any) {

	let $rid = fn::ridParam("instanceSettings", $InstanceSettingsID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "instance" { type::record("instanceSettings", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteInstanceSettings | failed to delete InstanceSettings";
	}

};
