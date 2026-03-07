DEFINE FUNCTION OVERWRITE fn::updateFAQ($FAQID: any, $payload: object) {

	let $rid = fn::ridParam("faq", $FAQID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateFAQ | payload is required";
	};

	let $current = (select * from $rid)[0];

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
		faqCategorys: if type::is_array($tax_faqCategorys) || $tax_faqCategorys { $tax_faqCategorys_norm } else { $payload.faqCategorys }
	});


	let $result = update $rid merge $payload;
	let $result = if type::is_array($result) { array::first($result) } else { $result };

	// --- Refresh Record views
	update $rid merge {
		"touch": 1
	};
	update $rid unset touch;

	let $PID = fn::PID($rid);

	if(type::is_record($PID) && record::exists($PID)) {
		update $PID merge {
			"touch": 1
		};
		update $PID unset touch;
	};
	// --- End Refresh Record views

	if type::is_array($tax_faqCategorys) {
		delete from FAQFaqCategorys where in = $rid;
		for $rel in $tax_faqCategorys_norm {
			fn::attachTerm("faq", "faqCategory", $rid, $rel, {});
		};
	} else if $tax_faqCategorys {
		delete from FAQFaqCategorys where in = $rid;
		for $rel in $tax_faqCategorys_norm {
			fn::attachTerm("faq", "faqCategory", $rid, $rel, {});
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateFAQ | failed to update FAQ";
	}

};
