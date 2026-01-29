DEFINE FUNCTION overwrite fn::PID($recordID: record, $options: option<object>) {

	let $defaults = {
		createOnMissing: false
	};

	let $options = fn::objectAssign($defaults, $options ?? {});

	if(!type::is_record($recordID)) {
			throw "PID | provided recordID is not of type record";
	};
	
	if !record::exists($recordID) {
		if($createOnMissing) {
			fn::createPost({
					title: record::id($recordID),
					id: $recordID
			});

			fn::stringID([$recordID]);
		};
	};

	return type::record('p', fn::stringID([$recordID]));
};