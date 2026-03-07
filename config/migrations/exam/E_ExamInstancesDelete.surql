DEFINE EVENT OVERWRITE ExamInstancesDelete ON TABLE exam WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "ExamInstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };