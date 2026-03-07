DEFINE FUNCTION OVERWRITE fn::viewTestimonialTypesense($TestimonialId: any) {

	let $RID = fn::ridParam("testimonial", $TestimonialId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewTestimonialTypesense | expects valid $TestimonialId record';
	};

	return SELECT
	    id,
	    name,
	    role,
	    organisation,
	    quote,
	    rating,
	    order,
	    instances,
	    (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post
	FROM only $RID;
};
