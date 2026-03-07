DEFINE EVENT OVERWRITE TestimonialInstancesUpdate ON TABLE testimonial WHEN $event = "UPDATE" THEN { if ($after.instances != $before.instances) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "TestimonialInstancesUpdate | invalid record id"; };
  fn::clearEdgesForRecord($RID, "Instances");

  if (type::is_array($after.instances) and array::len($after.instances) > 0) {
    for $instanceCode in $after.instances {
      let $instanceID = type::record("instance", $instanceCode);
      if !fn::RIDExists($instanceID) { throw "TestimonialInstancesUpdate | invalid instance id"; };
      fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
    };
  };
} };