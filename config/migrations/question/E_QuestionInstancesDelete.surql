DEFINE EVENT OVERWRITE QuestionInstancesDelete ON TABLE q WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "QuestionInstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };