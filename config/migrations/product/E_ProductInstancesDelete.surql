DEFINE EVENT OVERWRITE ProductInstancesDelete ON TABLE product WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "ProductInstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };