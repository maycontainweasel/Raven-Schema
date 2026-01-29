DEFINE FUNCTION fn::queryTaxonomy($target: object, $options: option<object>) {
	if !$target || !type::is_object($target) {
		throw "queryTaxonomy | target is required";
	};
	if !$target.model {
		throw "queryTaxonomy | target.model is required";
	};
	if !$target.taxonomy {
		throw "queryTaxonomy | target.taxonomy is required";
	};

	let $model = <string> $target.model;
	let $taxonomy = <string> $target.taxonomy;
	let $termInput = $target.term;

	if !$termInput {
		throw "queryTaxonomy | target.term is required";
	};

	let $options = if type::is_object($options) { $options } else { {} };
	let $limit = if type::is_number($options.limit) { $options.limit } else { null };
	let $offset = if type::is_number($options.offset) { $options.offset } else { 0 };
	let $doCount = if type::is_bool($options.count) { $options.count } else { false };

	let $meta = fn::getTaxonomyMeta($model, $taxonomy);
	if !$meta {
		throw "queryTaxonomy | taxonomy not registered";
	};

	let $termModel = <string> ($meta.termModel ?? "term");
	let $edgeTable = <string> ($meta.edgeRecordToTerm ?? "");
	if !$edgeTable || $edgeTable == "" {
		throw "queryTaxonomy | edgeRecordToTerm missing";
	};

	let $TERM_ID = fn::ridParam($termModel, $termInput);
	let $ids = select value in from type::table($edgeTable) where out = $TERM_ID;

	let $data = if $limit && $limit > 0 {
		select * from type::table($model) where id in $ids start $offset limit $limit;
	} else {
		select * from type::table($model) where id in $ids start $offset;
	};

	let $total = if $doCount {
		array::len($ids);
	} else {
		null;
	};

	return {
		data: $data,
		meta: {
			model: $model,
			taxonomy: $taxonomy,
			term: $TERM_ID,
			limit: $limit,
			offset: $offset,
			total: $total,
		}
	};
};
