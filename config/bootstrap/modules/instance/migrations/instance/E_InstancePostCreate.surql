DEFINE EVENT OVERWRITE InstancePostCreate ON TABLE instance WHEN $event = "CREATE" THEN { let $RID = $after.id;
if !type::is_record($RID) { throw "InstancePostCreate | invalid record id"; };

fn::createPost({
  id: $RID,
  title: record::id($RID)
});
fn::attachRecordToPost($RID, { skipExists: true });
let $PID = fn::PID($RID);

if($after.status == 'publish') {
  fn::updatePost($PID, {
    "publishedAt": time::now()
  });
} else {
  fn::updatePost($PID, {
    "publishedAt": null
  });
} };