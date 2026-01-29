DEFINE FUNCTION OVERWRITE fn::updateQuestion($QuestionID: any, $payload: object) {

	let $rid = fn::ridParam("q", $QuestionID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateQuestion | payload is required";
	};

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
		tags: if type::is_array($tax_tags) || $tax_tags { $tax_tags_norm } else { $payload.tags }
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

	if type::is_array($tax_categories) {
		delete from QuestionQcats where in = $rid;
		for $rel in $tax_categories_norm {
			fn::attachQuestionQcatTerm($rid, $rel, {});
		};
	} else if $tax_categories {
		delete from QuestionQcats where in = $rid;
		for $rel in $tax_categories_norm {
			fn::attachQuestionQcatTerm($rid, $rel, {});
		};
	};

	if type::is_array($tax_tags) {
		delete from QuestionQtags where in = $rid;
		for $rel in $tax_tags_norm {
			fn::attachQuestionQtagTerm($rid, $rel, {});
		};
	} else if $tax_tags {
		delete from QuestionQtags where in = $rid;
		for $rel in $tax_tags_norm {
			fn::attachQuestionQtagTerm($rid, $rel, {});
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateQuestion | failed to update Question";
	}

};
