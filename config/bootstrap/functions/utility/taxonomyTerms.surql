DEFINE FUNCTION fn::ensureTaxonomyRecord($meta: object) {
	if !$meta || !type::is_object($meta) {
		return null;
	};

	let $TAX_ID = $meta.taxonomyRid;
	let $TAX_ROW = if type::is_record($TAX_ID) {
		select * from only $TAX_ID
	} else {
		NONE
	};
	if type::is_object($TAX_ROW) && type::is_record($TAX_ROW.id) {
		return $TAX_ID;
	};
	if !$TAX_ID {
		return null;
	};

	let $defaults = if type::is_object($meta.taxonomyDefaults) { $meta.taxonomyDefaults } else { {} };
	let $payload = fn::objectAssign($defaults, {});

	if !$payload.permalink || $payload.permalink == "" {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.key) });
	} else {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.permalink) });
	};

	upsert only $TAX_ID merge $payload;
	return $TAX_ID;
};

DEFINE FUNCTION fn::createTaxonomy($model: string, $taxonomy: string, $payload: option<object>) {
	let $meta = fn::getTaxonomyMeta($model, $taxonomy);
	if !$meta {
		throw "createTaxonomy | taxonomy not registered";
	};

	let $payloadInput = if type::is_object($payload) {
		$payload;
	} else {
		{};
	};

	let $defaults = if type::is_object($meta.taxonomyDefaults) { $meta.taxonomyDefaults } else { {} };
	let $payload = fn::objectAssign($defaults, $payloadInput);

	if !$payload.permalink || $payload.permalink == "" {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.key) });
	} else {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.permalink) });
	};

	let $TAX_ID = fn::ensureTaxonomyRecord($meta);
	if !$TAX_ID {
		throw "createTaxonomy | taxonomy record id not configured";
	};

	let $record = upsert only $TAX_ID merge $payload;
	return $record;
};

DEFINE FUNCTION fn::createTerm($model: string, $taxonomy: string, $payload: any) {
	let $meta = fn::getTaxonomyMeta($model, $taxonomy);
	if !$meta {
		throw "createTerm | taxonomy not registered";
	};

	let $payloadInput = if type::is_object($payload) {
		$payload;
	} else if $payload {
		{ label: $payload };
	} else {
		{};
	};

	if !$payloadInput.label && !$payloadInput.key {
		throw "createTerm | requires label or key";
	};

	let $defaults = if type::is_object($meta.termDefaults) { $meta.termDefaults } else { {} };
	let $payload = fn::objectAssign($defaults, $payloadInput);

	let $payload = fn::objectAssign($payload, {
		key: if !$payload.key || $payload.key == "" {
			string::slug(<string> $payload.label)
		} else {
			$payload.key
		},
		label: if !$payload.label || $payload.label == "" {
			$payload.key
		} else {
			$payload.label
		}
	});

	let $payload = fn::objectAssign($payload, {
		permalink: if !$payload.permalink || $payload.permalink == "" {
			string::slug(<string> $payload.key)
		} else {
			string::slug(<string> $payload.permalink)
		}
	});

	if $meta.hierarchical == true && $payload.parent && $payload.parent != "" {
		let $PARENT_ID = fn::ridParam($meta.termModel ?? "term", $payload.parent);
		let $PARENT_ROW = if type::is_record($PARENT_ID) {
			select * from only $PARENT_ID
		} else {
			NONE
		};
		if !(type::is_object($PARENT_ROW) && type::is_record($PARENT_ROW.id)) {
			throw "createTerm | parent not found";
		};
		let $payload = fn::objectAssign($payload, { parent: $PARENT_ID });
	};

	let $TAX_ID = fn::ensureTaxonomyRecord($meta);
	let $TERM_ID = type::record($meta.termModel ?? "term", $payload.key);
	let $record = upsert only $TERM_ID merge $payload;

	if $TAX_ID && $meta.edgeTaxonomyToTerm {
		fn::createEdge($TAX_ID, $meta.edgeTaxonomyToTerm, $TERM_ID, {
			boundId: true,
			overwrite: false,
			skipExists: true
		});
	};

	return $record;
};

DEFINE FUNCTION fn::updateTerm($model: string, $taxonomy: string, $term: any, $payload: object) {
	let $meta = fn::getTaxonomyMeta($model, $taxonomy);
	if !$meta {
		throw "updateTerm | taxonomy not registered";
	};

	if !$payload {
		throw "updateTerm | payload is required";
	};

	let $TERM_ID = fn::ridParam($meta.termModel ?? "term", $term);
	let $TERM_ROW = if type::is_record($TERM_ID) {
		select * from only $TERM_ID
	} else {
		NONE
	};
	if !(type::is_object($TERM_ROW) && type::is_record($TERM_ROW.id)) {
		throw "updateTerm | term not found";
	};

	if $payload.key && $payload.key != "" {
		let $currentKey = record::id($TERM_ID);
		if $payload.key != $currentKey {
			throw "updateTerm | key changes are not supported";
		};
	};

	if $payload.permalink && $payload.permalink != "" {
		let $payload = fn::objectAssign($payload, { permalink: string::slug(<string> $payload.permalink) });
	};

	if $meta.hierarchical == true && $payload.parent && $payload.parent != "" {
		let $PARENT_ID = fn::ridParam($meta.termModel ?? "term", $payload.parent);
		let $PARENT_ROW = if type::is_record($PARENT_ID) {
			select * from only $PARENT_ID
		} else {
			NONE
		};
		if !(type::is_object($PARENT_ROW) && type::is_record($PARENT_ROW.id)) {
			throw "updateTerm | parent not found";
		};
		let $payload = fn::objectAssign($payload, { parent: $PARENT_ID });
	};

	let $record = update only $TERM_ID merge $payload;
	return $record;
};

DEFINE FUNCTION fn::removeTerm($model: string, $taxonomy: string, $term: any) {
	let $meta = fn::getTaxonomyMeta($model, $taxonomy);
	if !$meta {
		throw "removeTerm | taxonomy not registered";
	};

	let $TERM_ID = fn::ridParam($meta.termModel ?? "term", $term);
	let $TERM_ROW = if type::is_record($TERM_ID) {
		select * from only $TERM_ID
	} else {
		NONE
	};
	if !(type::is_object($TERM_ROW) && type::is_record($TERM_ROW.id)) {
		throw "removeTerm | term not found";
	};

	if $meta.edgeTaxonomyToTerm {
		fn::clearEdgesForRecord($TERM_ID, $meta.edgeTaxonomyToTerm, { from: "out" });
	};
	if $meta.edgeRecordToTerm {
		fn::clearEdgesForRecord($TERM_ID, $meta.edgeRecordToTerm, { from: "out" });
	};

	if $meta.storeOnModel == true && $meta.payloadField {
		let $records = select * from type::table($model);
		for $row in $records {
			let $current = $row[$meta.payloadField] ?? null;
			if $meta.cardinality == "one" {
				if $current == $TERM_ID {
					let $patch = object::from_entries([[$meta.payloadField, null]]);
					update $row.id merge $patch;
				};
			} else {
				if type::is_array($current) && array::find_index($current, $TERM_ID) != none {
					let $next = array::remove($current, $TERM_ID);
					let $patch = object::from_entries([[$meta.payloadField, $next]]);
					update $row.id merge $patch;
				};
			};
		};
	};

	let $record = (delete only $TERM_ID return before);
	return $record;
};

DEFINE FUNCTION fn::attachTerm($model: string, $taxonomy: string, $record: any, $term: any, $options: option<object>) {
	let $meta = fn::getTaxonomyMeta($model, $taxonomy);
	if !$meta {
		throw "attachTerm | taxonomy not registered";
	};

	let $RID = fn::ridParam($model, $record);
	let $skipExists = if type::is_object($options) && $options.skipExists {
		$options.skipExists
	} else {
		false
	};
	let $RID_ROW = if type::is_record($RID) {
		select * from only $RID
	} else {
		NONE
	};
	if !type::is_record($RID) || (!$skipExists && !(type::is_object($RID_ROW) && type::is_record($RID_ROW.id))) {
		throw "attachTerm | record not found";
	};

	let $TERM_ID = fn::ridParam($meta.termModel ?? "term", $term);
	let $createOnAttach = if $meta.createOnAttach == false {
		false
	} else {
		true
	};
	let $TERM_ROW = (
		select *
		from type::table($meta.termModel ?? "term")
		where id = $TERM_ID
		limit 1
	);
	let $TERM_ROW = if type::is_array($TERM_ROW) { array::first($TERM_ROW) } else { $TERM_ROW };
	let $TERM_EXISTS = type::is_object($TERM_ROW) && type::is_record($TERM_ROW.id);
	if !$TERM_EXISTS {
		if !$createOnAttach {
			throw "attachTerm | term not found";
		};

		let $termPayload = if type::is_record($term) {
			{ key: record::id($term) }
		} else if type::is_object($term) && $term.key {
			$term
		} else if type::is_object($term) && $term.id {
			fn::objectAssign($term, {
				key: if type::is_record($term.id) {
					record::id($term.id)
				} else {
					$term.id
				}
			})
		} else if type::is_object($term) {
			$term
		} else {
			{ key: record::id($TERM_ID) }
		};
		let $created = fn::createTerm($model, $taxonomy, $termPayload);
		let $createdId = if type::is_array($created) && array::len($created) > 0 {
			let $first = array::first($created);
			if type::is_object($first) && $first.id {
				$first.id
			} else {
				$first
			}
		} else if type::is_object($created) && $created.id {
			$created.id
		} else if type::is_record($created) {
			$created
		} else if type::is_object($termPayload) && $termPayload.key {
			$termPayload.key
		} else {
			$term
		};
		let $TERM_ID = fn::ridParam($meta.termModel ?? "term", $createdId);
		let $TERM_ROW = (
			select *
			from type::table($meta.termModel ?? "term")
			where id = $TERM_ID
			limit 1
		);
		let $TERM_ROW = if type::is_array($TERM_ROW) { array::first($TERM_ROW) } else { $TERM_ROW };
		if !(type::is_object($TERM_ROW) && type::is_record($TERM_ROW.id)) {
			throw "attachTerm | failed to auto-create term";
		};
	};

	if $meta.cardinality == "one" && $meta.edgeRecordToTerm {
		fn::clearEdgesForRecord($RID, $meta.edgeRecordToTerm);
	};

	if $meta.edgeRecordToTerm {
		fn::createEdge($RID, $meta.edgeRecordToTerm, $TERM_ID, {
			boundId: true,
			overwrite: false,
			skipExists: true
		});
	};

	if $meta.storeOnModel == true && $meta.payloadField {
		if $meta.cardinality == "one" {
			let $patch = object::from_entries([[$meta.payloadField, $TERM_ID]]);
			update $RID merge $patch;
		} else {
			let $row = select * from only $RID;
			let $row = if type::is_object($row) { $row } else { {} };
			let $current = $row[$meta.payloadField] ?? [];
			let $next = array::distinct(array::concat($current, [$TERM_ID]));
			let $patch = object::from_entries([[$meta.payloadField, $next]]);
			update $RID merge $patch;
		};
	};

	return $TERM_ID;
};

DEFINE FUNCTION fn::detachTerm($model: string, $taxonomy: string, $record: any, $term: any, $options: option<object>) {
	let $meta = fn::getTaxonomyMeta($model, $taxonomy);
	if !$meta {
		throw "detachTerm | taxonomy not registered";
	};

	let $RID = fn::ridParam($model, $record);
	let $skipExists = if type::is_object($options) && $options.skipExists {
		$options.skipExists
	} else {
		false
	};
	let $RID_ROW = if type::is_record($RID) {
		select * from only $RID
	} else {
		NONE
	};
	if !type::is_record($RID) || (!$skipExists && !(type::is_object($RID_ROW) && type::is_record($RID_ROW.id))) {
		throw "detachTerm | record not found";
	};

	let $TERM_ID = fn::ridParam($meta.termModel ?? "term", $term);
	let $TERM_ROW = if type::is_record($TERM_ID) {
		select * from only $TERM_ID
	} else {
		NONE
	};
	if !(type::is_object($TERM_ROW) && type::is_record($TERM_ROW.id)) {
		throw "detachTerm | term not found";
	};

	if $meta.edgeRecordToTerm {
		fn::deleteEdge($RID, $meta.edgeRecordToTerm, $TERM_ID, { boundId: true });
	};

	if $meta.storeOnModel == true && $meta.payloadField {
		if $meta.cardinality == "one" {
			let $patch = object::from_entries([[$meta.payloadField, null]]);
			update $RID merge $patch;
		} else {
			let $row = select * from only $RID;
			let $row = if type::is_object($row) { $row } else { {} };
			let $current = $row[$meta.payloadField] ?? [];
			let $next = array::remove($current, $TERM_ID);
			let $patch = object::from_entries([[$meta.payloadField, $next]]);
			update $RID merge $patch;
		};
	};

	return $TERM_ID;
};

DEFINE FUNCTION fn::getTerms($model: string, $taxonomy: string) {
	let $meta = fn::getTaxonomyMeta($model, $taxonomy);
	if !$meta {
		throw "getTerms | taxonomy not registered";
	};

	let $TAX_ID = $meta.taxonomyRid;
	let $TAX_ROW = if type::is_record($TAX_ID) {
		select * from only $TAX_ID
	} else {
		NONE
	};
	if !$TAX_ID || !(type::is_object($TAX_ROW) && type::is_record($TAX_ROW.id)) {
		return [];
	};

	if !$meta.edgeTaxonomyToTerm {
		return [];
	};

	let $termIds = select value out from type::table($meta.edgeTaxonomyToTerm) where in = $TAX_ID;
	if !type::is_array($termIds) || array::len($termIds) == 0 {
		return [];
	};

	return select * from type::table($meta.termModel ?? "term") where id in $termIds;
};

DEFINE FUNCTION fn::getRecordTerms($model: string, $taxonomy: string, $record: any) {
	let $meta = fn::getTaxonomyMeta($model, $taxonomy);
	if !$meta {
		throw "getRecordTerms | taxonomy not registered";
	};

	let $RID = fn::ridParam($model, $record);
	let $RID_ROW = if type::is_record($RID) {
		select * from only $RID
	} else {
		NONE
	};
	if !type::is_record($RID) || !(type::is_object($RID_ROW) && type::is_record($RID_ROW.id)) {
		throw "getRecordTerms | record not found";
	};

	if !$meta.edgeRecordToTerm {
		return [];
	};

	let $termIds = select value out from type::table($meta.edgeRecordToTerm) where in = $RID;
	if !type::is_array($termIds) || array::len($termIds) == 0 {
		return [];
	};

	return select * from type::table($meta.termModel ?? "term") where id in $termIds;
};
