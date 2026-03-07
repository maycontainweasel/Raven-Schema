DEFINE FUNCTION OVERWRITE fn::createTestimonial($payload: object) {

	if !$payload {
		throw "createTestimonial | payload is required";
	};

	if $payload.name = NONE || $payload.name = null || (type::is_string($payload.name) && string::len($payload.name) = 0) {
		throw "createTestimonial | requires name";
	};
	if $payload.quote = NONE || $payload.quote = null || (type::is_string($payload.quote) && string::len($payload.quote) = 0) {
		throw "createTestimonial | requires quote";
	};
	if $payload.active = NONE || $payload.active = null || (type::is_string($payload.active) && string::len($payload.active) = 0) {
		throw "createTestimonial | requires active";
	};

	let $defaultData = {
		name: "",
		role: "",
		organisation: "",
		quote: "",
		avatar: "",
		rating: 0,
		order: 0,
		active: true,
		instances: [],
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	if !type::is_array($payload.instances){
		throw "createTestimonial | requires valid instances array";
	};

	let $record = upsert testimonial content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createTestimonial | failed to create testimonial";
	};

	return if $record {
		return $record;
	} else {
		throw "createTestimonial | failed to create testimonial";
	}

};

