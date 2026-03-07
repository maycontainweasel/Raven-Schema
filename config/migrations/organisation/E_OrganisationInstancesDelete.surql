DEFINE EVENT OVERWRITE OrganisationInstancesDelete ON TABLE organisation WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "OrganisationInstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };