DEFINE FUNCTION fn::linkRecordToInstance($RID: record, $instanceCode: string, $options: option<object>) {
  let $skipExists = if type::is_object($options) && $options.skipExists { $options.skipExists } else { true };
  if !type::is_record($RID) {
		throw "linkRecordToInstance | invalid record";
	};
  if !$skipExists && !fn::RIDExists($RID) {
		throw "linkRecordToInstance | expects valid record";
	};

	let $instanceID = type::record("instance", $instanceCode);

	if !fn::RIDExists($instanceID) {
		throw "linkRecordToInstance | $instanceID for provided instanceCode is not a valid record";
	};

	fn::createEdge($RID, "Instances", $instanceID, {
		boundId: true,
		overwrite: false,
		skipExists: $skipExists
	});
};
