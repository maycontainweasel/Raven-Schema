DEFINE FUNCTION fn::getRecordInstanceIDs($recordID: record) {
	if !fn::RIDExists($recordID) {
    THROW "getRecordInstanceIDs | Record ID is required";
  };

  return (select value instances from only $recordID).map(|$v| type::record('instance', $v));
};