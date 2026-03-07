DEFINE EVENT OVERWRITE FAQPostDelete ON TABLE faq WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "FAQPostDelete | invalid record id"; };
let $PID = fn::PID($RID);
fn::deleteEdge($PID, "Post", $RID, { boundId: true });
fn::deletePost($PID) };