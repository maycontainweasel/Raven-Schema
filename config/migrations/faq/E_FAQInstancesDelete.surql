DEFINE EVENT OVERWRITE FAQInstancesDelete ON TABLE faq WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "FAQInstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };