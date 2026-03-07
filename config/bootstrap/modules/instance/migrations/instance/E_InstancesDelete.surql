DEFINE EVENT OVERWRITE InstancesDelete ON TABLE instance WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "InstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };