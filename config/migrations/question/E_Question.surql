DEFINE EVENT OVERWRITE QuestionCreateSubTables ON TABLE q WHEN $event = "CREATE" THEN {
  let $PARENT_ID = $after.id;
  if !type::is_record($PARENT_ID) {
    throw "QuestionCreateSubTables | invalid parent record id";
  };
  fn::createQuestionRecord($PARENT_ID, { skipExists: true });
} COMMENT "Auto-generated to ensure required sub tables exist when the parent is created.";

DEFINE EVENT OVERWRITE QuestionDelete ON TABLE q WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteQuestionRecord(type::record('qRecord', record::id($id)));
  fn::deleteEdgeFromIn($id, 'QuestionRecord', false);
  fn::deleteEdgeFromIn($id, 'QuestionOption', true);
};

DEFINE EVENT OVERWRITE QuestionInstancesCreate ON TABLE q WHEN $event = "CREATE" THEN { if (type::is_array($after.instances) and array::len($after.instances) > 0) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "QuestionInstancesCreate | invalid record id"; };
  for $instanceCode in $after.instances {
    let $instanceID = type::record("instance", $instanceCode);
    if !fn::RIDExists($instanceID) { throw "QuestionInstancesCreate | invalid instance id"; };
    fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
  };
} };

DEFINE EVENT OVERWRITE QuestionInstancesDelete ON TABLE q WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "QuestionInstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };

DEFINE EVENT OVERWRITE QuestionInstancesUpdate ON TABLE q WHEN $event = "UPDATE" THEN { if ($after.instances != $before.instances) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "QuestionInstancesUpdate | invalid record id"; };
  fn::clearEdgesForRecord($RID, "Instances");

  if (type::is_array($after.instances) and array::len($after.instances) > 0) {
    for $instanceCode in $after.instances {
      let $instanceID = type::record("instance", $instanceCode);
      if !fn::RIDExists($instanceID) { throw "QuestionInstancesUpdate | invalid instance id"; };
      fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
    };
  };
} };

DEFINE EVENT OVERWRITE QuestionPostCreate ON TABLE q WHEN $event = "CREATE" THEN { let $RID = $after.id;
if !type::is_record($RID) { throw "QuestionPostCreate | invalid record id"; };

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

DEFINE EVENT OVERWRITE QuestionPostDelete ON TABLE q WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "QuestionPostDelete | invalid record id"; };
let $PID = fn::PID($RID);
fn::deleteEdge($PID, "Post", $RID, { boundId: true });
fn::deletePost($PID, { skipExists: true }) };

DEFINE EVENT OVERWRITE QuestionPostUpdate ON TABLE q WHEN $event = "UPDATE" THEN { let $RID = $after.id;
if !type::is_record($RID) { throw "QuestionPostUpdate | invalid record id"; };
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
