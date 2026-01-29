DEFINE FUNCTION fn::attachRecordToPost($RID: record, $options: option<object>) {
  let $skipExists = if type::is_object($options) && $options.skipExists { $options.skipExists } else { false };
  if !$skipExists && !fn::RIDExists($RID) {
    THROW "attachRecordToPost | $RID doesn't exist";
  };

  let $PID = fn::PID($RID);

  let $PID = if (!fn::RIDExists($PID)) {
    fn::createPost({
      id: $RID,
      title: <string> record::id($RID)
    });

    fn::PID($RID);
  } else {
    $PID;
  };

  return if fn::RIDExists($PID) {
    fn::createEdge($PID, "Post", $RID, {
      boundId: true,
      overwrite: false,
      skipExists: $skipExists
    });
  } else {
    null;
  };
};
