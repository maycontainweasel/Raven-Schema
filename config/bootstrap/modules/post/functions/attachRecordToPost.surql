DEFINE FUNCTION fn::attachRecordToPost($RID: record, $options: option<object>) {
  let $skipExists = if type::is_object($options) && $options.skipExists { $options.skipExists } else { true };
  if !type::is_record($RID) {
    THROW "attachRecordToPost | invalid $RID";
  };
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
    let $REL = select * from Post where in = $PID and out = $RID;
    if $REL && count($REL) > 0 {
      return $REL;
    };

    let $EDGE_ID = type::record('Post', fn::stringID([$PID, $RID]));
    let $EDGE = array::first(select * from $EDGE_ID);
    if $EDGE {
      if $EDGE.in != $PID || $EDGE.out != $RID {
        delete $EDGE_ID;
      } else {
        return $EDGE;
      };
    };

    return relate only $PID->Post->$RID
      set id = $EDGE_ID;
  } else {
    null;
  };
};
