DEFINE FUNCTION fn::view($viewName: string, $RID: record) {
	
	if !$viewName {
		 throw 'returnView | requires a viewName to return a view table';
	};

	if !type::is_record($RID) || !record::exists($RID) {
		return null;
	};
	
	return select *, $RID as id from only type::record($viewName, $RID);
	
};