DEFINE FUNCTION fn::initAdminPostRecord($RECORD_ID: record) {
	if !$RECORD_ID {
    THROW "getAdminPostRecord | $RECORD_ID is required";
  };

	if !fn::RIDExists($RECORD_ID) {
		THROW "getAdminPostRecord | $RECORD_ID doesn't exist";
	};

	return select *, 
		(
			fn::getRecordInstanceKeys(fn::PID($RECORD_ID)).filter(|$v| $v != 'pm')
		) as instances
	from fn::getPostByID($RECORD_ID);

};