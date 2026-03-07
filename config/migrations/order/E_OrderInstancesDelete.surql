DEFINE EVENT OVERWRITE OrderInstancesDelete ON TABLE order WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "OrderInstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };