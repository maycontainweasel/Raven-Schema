DEFINE FUNCTION overwrite fn::getPostIDByRecordID($RID: record) {

  if !fn::RIDExists($RID) {
    THROW "getPostIDByRecordID | RecordID is required";
  };

  return fn::PID($RID);
};