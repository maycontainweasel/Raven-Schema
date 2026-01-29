DEFINE FUNCTION fn::detachRecordFromPost($RID: record) {
	
	if !$RID {
    THROW "detachRecordFromPost | RID couldn't be retrieved";
  };

  let $PID = type::record('p', $RID);

  if !type::is_record($PID) || !record::exists($PID) {
    //THROW "detachRecordFromPost | PID couldn't be retrieved";
    return null;
  };

  let $REL = select * from Post where in = $PID and out = $RID;

  return if ($REL || count($REL) > 0) {
    delete $REL;
    return true;
  } else {
    // If it doesn't exist then there is nothig to do 
    return true;
  }
  
};