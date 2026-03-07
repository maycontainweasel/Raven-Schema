DEFINE EVENT OVERWRITE ExamInstancesCreate ON TABLE exam WHEN $event = "CREATE" THEN { if (type::is_array($after.instances) and array::len($after.instances) > 0) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "ExamInstancesCreate | invalid record id"; };
  for $instanceCode in $after.instances {
    let $instanceID = type::record("instance", $instanceCode);
    if !fn::RIDExists($instanceID) { throw "ExamInstancesCreate | invalid instance id"; };
    fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
  };
} };