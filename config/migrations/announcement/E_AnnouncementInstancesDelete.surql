DEFINE EVENT OVERWRITE AnnouncementInstancesDelete ON TABLE announcement WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "AnnouncementInstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };