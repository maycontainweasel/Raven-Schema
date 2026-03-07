DEFINE EVENT OVERWRITE FAQPostCreate ON TABLE faq WHEN $event = "CREATE" THEN { let $RID = $after.id;
if !type::is_record($RID) { throw "FAQPostCreate | invalid record id"; };

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