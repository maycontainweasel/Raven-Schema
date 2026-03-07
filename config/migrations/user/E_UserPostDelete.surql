DEFINE EVENT OVERWRITE UserPostDelete ON TABLE u WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "UserPostDelete | invalid record id"; };
let $PID = fn::PID($RID);
fn::deleteEdge($PID, "Post", $RID, { boundId: true });
fn::deletePost($PID) };