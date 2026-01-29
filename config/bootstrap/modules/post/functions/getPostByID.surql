DEFINE FUNCTION fn::getPostByID($RID: record) {

	if !fn::RIDExists($RID) {
		THROW "getPostByID | $RID is not a valid record";
	};
	
	let $PID = fn::PID($RID);

	return if fn::RIDExists($PID) {
		return select * from $PID limit 1;
	} else {
		return null;
	};

};