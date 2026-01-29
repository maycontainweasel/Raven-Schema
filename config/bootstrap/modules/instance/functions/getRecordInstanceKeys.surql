DEFINE FUNCTION fn::getRecordInstanceKeys($recordID: record) {
	if !fn::RIDExists($recordID) {
    THROW "getRecordInstanceKeys | Record ID is required";
  };

	let $InstanceIDS = select value instances from only $recordID;

	if !fn::isArray($InstanceIDS) {
		THROW "getRecordInstanceKeys | Retrieved instances is not a valid array";
	};

	return select value key from $InstanceIDS;

};