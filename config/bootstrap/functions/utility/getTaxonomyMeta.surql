DEFINE FUNCTION fn::getTaxonomyMeta($model: string, $taxonomy: string) {
	if !$model || !type::is_string($model) {
		throw "getTaxonomyMeta | model is required";
	};
	if !$taxonomy || !type::is_string($taxonomy) {
		throw "getTaxonomyMeta | taxonomy is required";
	};

	let $APP_ID = type::record("app", "taxonomies");
	let $app = (select * from $APP_ID)[0];
	if !$app {
		return null;
	};

	let $modelEntry = $app[$model];
	if !$modelEntry || !$modelEntry.taxonomies {
		return null;
	};

	return $modelEntry.taxonomies[$taxonomy] ?? null;
};
