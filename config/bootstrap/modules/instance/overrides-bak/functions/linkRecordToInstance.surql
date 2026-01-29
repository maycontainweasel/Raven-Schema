DEFINE FUNCTION fn::linkRecordToInstance($RID: record, $instanceCode: string, $options: option<object>) {
  let $skipExists = if type::is_object($options) && $options.skipExists { $options.skipExists } else { true };
  if !type::is_record($RID) {
    throw "linkRecordToInstance | invalid record";
  };
  if !$skipExists && !fn::RIDExists($RID) {
    throw "linkRecordToInstance | expects valid record";
  };

  let $instanceID = type::record("instance", $instanceCode);

  if !fn::RIDExists($instanceID) {
    throw "linkRecordToInstance | $instanceID for provided instanceCode is not a valid record";
  };

  let $REL = select * from Instances where in = $RID and out = $instanceID;

  if !$REL || array::len($REL) == 0 {
    let $EDGE_ID = type::record('Instances', fn::stringID([$RID, $instanceID]));
    let $EDGE = array::first(select * from $EDGE_ID);

    if $EDGE {
      if $EDGE.in != $RID || $EDGE.out != $instanceID {
        delete $EDGE_ID;
      } else {
        return null;
      };
    };

    relate only $RID->Instances->$instanceID set id = $EDGE_ID;
  };
};
