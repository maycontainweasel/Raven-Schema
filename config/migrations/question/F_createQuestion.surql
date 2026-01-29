DEFINE FUNCTION OVERWRITE fn::createQuestion($payload: object) {

	if !$payload {
		throw "createQuestion | payload is required";
	};

	if !$payload.qid {
		throw "createQuestion | requires qid";
	};
	if !$payload.question {
		throw "createQuestion | requires question";
	};

	let $defaultData = {
		qid: 0,
		qCode: "",
		question: "",
		explanation: "",
		explanationRef: "",
		source: "",
		instances: [],
		testobject: {
			testobjectnumber: 0,
			testobjectstring: "",
			testobjectdarray: [],
			testobjectobject: {
				testobjectobjectnumber: 0,
				testobjectobjectstring: "",
				testobjectobjectarray: [],
			},
		},
		tags: [],
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $tax_categories = $payload.categories;
	let $tax_tags = $payload.tags;

	let $payload = fn::objectRemove($payload, ["categories"]);

	let $tax_categories_list = if type::is_array($tax_categories) {
		$tax_categories
	} else if $tax_categories {
		[$tax_categories]
	} else {
		[]
	};
	let $tax_categories_norm = array::map($tax_categories_list, |$term| {
		if type::is_record($term) {
			$term
		};
		let $termPayload = { key: $term };
		type::record('t_q_qcat', $termPayload.key)
	});

	let $tax_tags_list = if type::is_array($tax_tags) {
		$tax_tags
	} else if $tax_tags {
		[$tax_tags]
	} else {
		[]
	};
	let $tax_tags_norm = array::map($tax_tags_list, |$term| {
		if type::is_record($term) {
			$term
		};
		let $termPayload = { key: $term };
		type::record('t_q_qtag', $termPayload.key)
	});
	let $payload = fn::objectAssign($payload, {
		tags: $tax_tags_norm
	});


	if !type::is_array($payload.instances){
		throw "createQuestion | requires valid instances array";
	};

	let $rid = type::record('q', $payload.qid);
	let $payload = fn::objectRemove($payload, ["id"]);
	let $record = upsert $rid content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	if type::is_array($tax_categories_norm) {
		for $rel in $tax_categories_norm {
			fn::attachQuestionQcatTerm($rid, $rel, { skipExists: true });
		};
	} else if $tax_categories {
		for $rel in $tax_categories_norm {
			fn::attachQuestionQcatTerm($rid, $rel, { skipExists: true });
		};
	};

	if type::is_array($tax_tags_norm) {
		for $rel in $tax_tags_norm {
			fn::attachQuestionQtagTerm($rid, $rel, { skipExists: true });
		};
	} else if $tax_tags {
		for $rel in $tax_tags_norm {
			fn::attachQuestionQtagTerm($rid, $rel, { skipExists: true });
		};
	};


	return if $record {
		return $record;
	} else {
		throw "createQuestion | failed to create q";
	}

};

