DEFINE FUNCTION OVERWRITE fn::deleteTestimonial($TestimonialID: any) {

	let $rid = fn::ridParam("testimonial", $TestimonialID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteTestimonial | failed to delete Testimonial";
	}

};
