DEFINE EVENT OVERWRITE ExamPostDelete ON TABLE exam WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "ExamPostDelete | invalid record id"; };
let $PID = fn::PID($RID);
fn::deleteEdge($PID, "Post", $RID, { boundId: true });
fn::deletePost($PID) };