DEFINE EVENT OVERWRITE UserInstancesDelete ON TABLE u WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "UserInstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };