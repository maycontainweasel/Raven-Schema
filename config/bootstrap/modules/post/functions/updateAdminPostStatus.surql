DEFINE FUNCTION fn::updateAdminPostStatus($RECORD_ID: record, $status: string) {
	if !fn::RIDExists($RECORD_ID) {
    THROW "updateAdminPostStatus | $RECORD_ID is required";
  };

	if !$status {
    THROW "updateAdminPostStatus | $status is required";
  };
	
	let $PID = fn::PID($RECORD_ID);
	
	if !fn::RIDExists($PID) {
		THROW "updateAdminPostStatus | $PID doesn't exist";
	};

	fn::refreshRecordViews($RECORD_ID);

	return update only $PID merge {
		"status": $status 
	};

};