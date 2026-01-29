DEFINE EVENT OVERWRITE UserInstancesCreate ON TABLE u WHEN $event = "CREATE" THEN { if (type::is_array($after.instances) and array::len($after.instances) > 0) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "UserInstancesCreate | invalid record id"; };
  for $instanceCode in $after.instances {
    let $instanceID = type::record("instance", $instanceCode);
    if !fn::RIDExists($instanceID) { throw "UserInstancesCreate | invalid instance id"; };
    fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
  };
} };

DEFINE EVENT OVERWRITE UserInstancesDelete ON TABLE u WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "UserInstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };

DEFINE EVENT OVERWRITE UserInstancesUpdate ON TABLE u WHEN $event = "UPDATE" THEN { if ($after.instances != $before.instances) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "UserInstancesUpdate | invalid record id"; };
  fn::clearEdgesForRecord($RID, "Instances");

  if (type::is_array($after.instances) and array::len($after.instances) > 0) {
    for $instanceCode in $after.instances {
      let $instanceID = type::record("instance", $instanceCode);
      if !fn::RIDExists($instanceID) { throw "UserInstancesUpdate | invalid instance id"; };
      fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
    };
  };
} };

DEFINE EVENT OVERWRITE UserPostCreate ON TABLE u WHEN $event = "CREATE" THEN { let $RID = $after.id;
if !type::is_record($RID) { throw "UserPostCreate | invalid record id"; };

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

DEFINE EVENT OVERWRITE UserPostDelete ON TABLE u WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "UserPostDelete | invalid record id"; };
let $PID = fn::PID($RID);
fn::deleteEdge($PID, "Post", $RID, { boundId: true });
fn::deletePost($PID, { skipExists: true }) };

DEFINE EVENT OVERWRITE UserPostUpdate ON TABLE u WHEN $event = "UPDATE" THEN { let $RID = $after.id;
if !type::is_record($RID) { throw "UserPostUpdate | invalid record id"; };
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
