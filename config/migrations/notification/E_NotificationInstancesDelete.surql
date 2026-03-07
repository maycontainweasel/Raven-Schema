DEFINE EVENT OVERWRITE NotificationInstancesDelete ON TABLE notification WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "NotificationInstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };