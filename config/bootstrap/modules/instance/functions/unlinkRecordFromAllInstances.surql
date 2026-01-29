DEFINE FUNCTION fn::unlinkRecordFromAllInstances($RID: record, $options: option<object>) {

	let $skipExists = if type::is_object($options) && $options.skipExists { $options.skipExists } else { false };

	if !type::is_record($RID) {
		throw "unlinkRecordFromAllInstances | expects valid record";
	};
	if !$skipExists && !fn::RIDExists($RID) {
		throw "unlinkRecordFromAllInstances | expects valid record";
	};

	return fn::clearEdgesForRecord($RID, "Instances");
};
