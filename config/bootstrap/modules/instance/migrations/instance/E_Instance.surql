DEFINE EVENT OVERWRITE InstanceDelete ON TABLE instance WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteInstanceSettings(type::record('instanceSettings', record::id($id)));
  fn::deleteEdgeFromIn($id, 'InstanceSettings', false);
  fn::deleteEdgeFromIn($id, 'Instances', false);
};

DEFINE EVENT OVERWRITE InstancePostCreate ON TABLE instance WHEN $event = "CREATE" THEN { let $RID = $after.id;
if !type::is_record($RID) { throw "InstancePostCreate | invalid record id"; };

fn::createPost({
  id: $RID,
  title: record::id($RID)
});
let $PID = fn::PID($RID);
fn::createEdge($PID, "Post", $RID, { boundId: true, overwrite: false, skipExists: true });

if($after.status == 'publish') {
  fn::updatePost($PID, {
    "publishedAt": time::now()
  });
} else {
  fn::updatePost($PID, {
    "publishedAt": null
  });
} };

DEFINE EVENT OVERWRITE InstancePostDelete ON TABLE instance WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "InstancePostDelete | invalid record id"; };
let $PID = fn::PID($RID);
fn::deleteEdge($PID, "Post", $RID, { boundId: true });
fn::deletePost($PID, { skipExists: true }) };

DEFINE EVENT OVERWRITE InstancePostUpdate ON TABLE instance WHEN $event = "UPDATE" THEN { let $RID = $after.id;
if !type::is_record($RID) { throw "InstancePostUpdate | invalid record id"; };
let $PID = fn::PID($RID);

if($after.status == "publish" and $before.status != "publish") {
  let $time = time::now();
  fn::updatePost($PID, {
    "updatedAt": $time,
    "publishedAt": $time
  });
} else if $after.status != "publish" {
  fn::updatePost($PID, {
    "updatedAt": time::now(),
    "publishedAt": null
  });
} };

DEFINE EVENT OVERWRITE InstancesCreate ON TABLE instance WHEN $event = "CREATE" THEN { if (type::is_array($after.instances) and array::len($after.instances) > 0) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "InstancesCreate | invalid record id"; };
  for $instanceCode in $after.instances {
    let $instanceID = type::record("instance", $instanceCode);
    if !fn::RIDExists($instanceID) { throw "InstancesCreate | invalid instance id"; };
    fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
  };
} };

DEFINE EVENT OVERWRITE InstancesDelete ON TABLE instance WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "InstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };

DEFINE EVENT OVERWRITE InstancesUpdate ON TABLE instance WHEN $event = "UPDATE" THEN { if ($after.instances != $before.instances) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "InstancesUpdate | invalid record id"; };
  fn::clearEdgesForRecord($RID, "Instances");

  if (type::is_array($after.instances) and array::len($after.instances) > 0) {
    for $instanceCode in $after.instances {
      let $instanceID = type::record("instance", $instanceCode);
      if !fn::RIDExists($instanceID) { throw "InstancesUpdate | invalid instance id"; };
      fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
    };
  };
} };
