DEFINE FUNCTION fn::detachAllInstancesFromRecord($RID: record) {

  if !fn::RIDExists($RID) {
		throw "detachAllInstancesFromRecord | expects valid record";
	};
	
	let $rels = select * from Instances where in = $RID;
	delete $rels;

	return true;
};