DEFINE FUNCTION overwrite fn::linkRecordToAllInstancesOfRecord($RID: record) {
  if (!fn::RIDExists($RID)) {
    THROW "linkRecordToAllInstancesOfRecord | $RID is not a valid record";
  };

	let $instances = select value instances from $RID;

	if (!fn::isArray($instances)) {
		THROW "linkRecordToAllInstancesOfRecord | retrieved $instances is not a valid array";
	};

	for $instanceKey in $instances {
		fn::linkRecordToInstance($RID, $instanceKey);
	};

	return true;
};