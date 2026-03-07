DEFINE EVENT OVERWRITE TestimonialInstancesDelete ON TABLE testimonial WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "TestimonialInstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };