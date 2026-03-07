DEFINE FUNCTION OVERWRITE fn::createFAQ($payload: object) {

	if !$payload {
		throw "createFAQ | payload is required";
	};

	if $payload.question = NONE || $payload.question = null || (type::is_string($payload.question) && string::len($payload.question) = 0) {
		throw "createFAQ | requires question";
	};
	if $payload.answer = NONE || $payload.answer = null || (type::is_string($payload.answer) && string::len($payload.answer) = 0) {
		throw "createFAQ | requires answer";
	};
	if $payload.category = NONE || $payload.category = null || (type::is_string($payload.category) && string::len($payload.category) = 0) {
		throw "createFAQ | requires category";
	};

	let $defaultData = {
		question: "",
		answer: "",
		category: "",
		faqCategorys: [],
		instances: [],
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $tax_faqCategorys = $payload.faqCategorys;

	let $tax_faqCategorys_list = if type::is_array($tax_faqCategorys) {
		$tax_faqCategorys
	} else if $tax_faqCategorys {
		[$tax_faqCategorys]
	} else {
		[]
	};
	let $tax_faqCategorys_norm = array::map($tax_faqCategorys_list, |$term| {
		if type::is_record($term) {
			type::record("t_faq_faqcategory", record::id($term))
		} else {
			let $termPayload = { key: $term };
			type::record('t_faq_faqcategory', $termPayload.key)
		};
	});
	let $payload = fn::objectAssign($payload, {
		faqCategorys: $tax_faqCategorys_norm
	});


	if !type::is_array($payload.instances){
		throw "createFAQ | requires valid instances array";
	};

	let $record = upsert faq content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createFAQ | failed to create faq";
	};

	if type::is_array($tax_faqCategorys_norm) {
		for $rel in $tax_faqCategorys_norm {
			fn::attachTerm("faq", "faqCategory", $recordID, $rel, { skipExists: true });
		};
	} else if $tax_faqCategorys {
		for $rel in $tax_faqCategorys_norm {
			fn::attachTerm("faq", "faqCategory", $recordID, $rel, { skipExists: true });
		};
	};


	return if $record {
		return $record;
	} else {
		throw "createFAQ | failed to create faq";
	}

};

