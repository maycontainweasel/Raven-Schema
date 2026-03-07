DEFINE EVENT OVERWRITE TestimonialInstancesCreate ON TABLE testimonial WHEN $event = "CREATE" THEN { if (type::is_array($after.instances) and array::len($after.instances) > 0) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "TestimonialInstancesCreate | invalid record id"; };
  for $instanceCode in $after.instances {
    let $instanceID = type::record("instance", $instanceCode);
    if !fn::RIDExists($instanceID) { throw "TestimonialInstancesCreate | invalid instance id"; };
    fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
  };
} };