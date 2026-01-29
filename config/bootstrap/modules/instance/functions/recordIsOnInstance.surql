DEFINE FUNCTION fn::recordIsOnInstance($recordID: record, $instanceCode: string) {
  let $PID = array::first(select value id from (fn::getPostByID($recordID)));
  let $IID = type::record('instance', $instanceCode);
  let $REL = select * from PostInstances where in = $PID and out = $IID;
  return if $REL {
    return $REL;
  } else {
    return false;
  }
};