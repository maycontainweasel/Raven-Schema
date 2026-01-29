
DEFINE FUNCTION fn::detachRecordFromInstance($RID: record, $instanceCode: string) {

  if !fn::RIDExists($RID) {
    THROW "detachRecordFromInstance | Record ID is required";
  };
  
  if (!$instanceCode) {
    THROW "detachRecordFromInstance | Instance code is required";
  };

  let $IID = type::record('instance', $instanceCode);
  if !fn::RIDExists($IID) {
    THROW "detachRecordFromInstance | $IID for provided instanceCode is not a valid record";
  };

  let $PID = fn::PID($RID);

  if !fn::RIDExists($PID) {
    THROW "detachRecordFromInstance | Record ID is required";
  };

  let $REL = select * from Instances where in = $IID and out = $PID;
  return if $REL {
    delete $REL;
    return true
  } else {
    return true;
  }
};