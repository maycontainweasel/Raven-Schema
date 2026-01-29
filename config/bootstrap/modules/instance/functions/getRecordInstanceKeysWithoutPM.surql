DEFINE FUNCTION fn::getRecordInstanceKeysWithoutPM($recordID: record) {
	if !fn::RIDExists($recordID) {
    THROW "getRecordInstanceKeysWithoutPM | Record id is required";
  };

	return fn::getRecordInstanceKeys($recordID).filter(|$v| $v != 'pm');
};