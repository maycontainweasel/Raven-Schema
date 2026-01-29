DEFINE FUNCTION OVERWRITE fn::createQuestionQcatTaxonomy($payload: option<object>) {

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else {
		{}
	};

	let $defaultData = {
		key: "qcat",
		label: "Category",
		labelPlural: "Categories",
		permalink: "qcat",
		description: "Question categories",
		hierarchical: false,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	if !$payload.permalink || $payload.permalink == "" {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.key) });
	} else {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.permalink) });
	};

	let $RID = type::record('tax', fn::stringID(["q", "qcat"]));
	let $record = upsert $RID merge $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $registryPayload = {
		key: "qcat",
		labels: { singular: "Category", plural: "Categories" },
		model: "q",
		taxonomyModel: "tax",
		termModel: "t_q_qcat",
		taxonomyRid: $RID,
		taxonomyIdSpec: "stringID<q, qcat>",
		termIdSpec: "<field:key>",
		edgeRecordToTerm: "QuestionQcats",
		edgeTaxonomyToTerm: "QuestionQcatTerms",
		cardinality: "many",
		storeOnModel: false,
		payloadField: "categories",
		payloadAliases: [],
		required: false,
		processor: "functions",
		hierarchical: true,
		taxonomyDefaults: {
  key: "qcat",
  label: "Category",
  labelPlural: "Categories",
  permalink: "qcat",
  description: "Question categories",
  hierarchical: false,
},
		termDefaults: {
  key: "",
  label: "",
  permalink: "",
  description: "",
  parent: "",
},
	};

	let $APP_ID = type::record("app", "taxonomies");
	let $app = (select * from $APP_ID)[0] ?? {};
	let $modelEntry = $app["q"] ?? {};
	let $taxMap = $modelEntry.taxonomies ?? {};
	let $taxMap = fn::objectAssign($taxMap, { "qcat": $registryPayload });
	let $modelEntry = fn::objectAssign($modelEntry, { taxonomies: $taxMap });
	upsert $APP_ID set q = $modelEntry;

	return $record;

};

DEFINE FUNCTION OVERWRITE fn::addQuestionQcatTerm($payload: any) {
	return fn::createTerm("q", "qcat", $payload);
};

DEFINE FUNCTION OVERWRITE fn::removeQuestionQcatTerm($term: any) {
	return fn::removeTerm("q", "qcat", $term);
};

DEFINE FUNCTION OVERWRITE fn::attachQuestionQcatTerm($RID: any, $term: any, $options: option<object>) {
	return fn::attachTerm("q", "qcat", $RID, $term, $options);
};

DEFINE FUNCTION OVERWRITE fn::detachQuestionQcatTerm($RID: any, $term: any, $options: option<object>) {
	return fn::detachTerm("q", "qcat", $RID, $term, $options);
};

DEFINE FUNCTION OVERWRITE fn::getQuestionQcatTerms() {
	return fn::getTerms("q", "qcat");
};

DEFINE FUNCTION OVERWRITE fn::getQuestionQcats($RID: any) {
	return fn::getRecordTerms("q", "qcat", $RID);
};

DEFINE FUNCTION OVERWRITE fn::createQuestionQtagTaxonomy($payload: option<object>) {

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else {
		{}
	};

	let $defaultData = {
		key: "qtag",
		label: "Tag",
		labelPlural: "Tags",
		permalink: "qtag",
		description: "Question tags",
		hierarchical: false,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	if !$payload.permalink || $payload.permalink == "" {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.key) });
	} else {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.permalink) });
	};

	let $RID = type::record('tax', fn::stringID(["q", "qtag"]));
	let $record = upsert $RID merge $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $registryPayload = {
		key: "qtag",
		labels: { singular: "Tag", plural: "Tags" },
		model: "q",
		taxonomyModel: "tax",
		termModel: "t_q_qtag",
		taxonomyRid: $RID,
		taxonomyIdSpec: "stringID<q, qtag>",
		termIdSpec: "<field:key>",
		edgeRecordToTerm: "QuestionQtags",
		edgeTaxonomyToTerm: "QuestionQtagTerms",
		cardinality: "many",
		storeOnModel: true,
		payloadField: "tags",
		payloadAliases: [],
		required: false,
		processor: "functions",
		hierarchical: false,
		taxonomyDefaults: {
  key: "qtag",
  label: "Tag",
  labelPlural: "Tags",
  permalink: "qtag",
  description: "Question tags",
  hierarchical: false,
},
		termDefaults: {
  key: "",
  label: "",
  permalink: "",
  description: "",
  parent: "",
},
	};

	let $APP_ID = type::record("app", "taxonomies");
	let $app = (select * from $APP_ID)[0] ?? {};
	let $modelEntry = $app["q"] ?? {};
	let $taxMap = $modelEntry.taxonomies ?? {};
	let $taxMap = fn::objectAssign($taxMap, { "qtag": $registryPayload });
	let $modelEntry = fn::objectAssign($modelEntry, { taxonomies: $taxMap });
	upsert $APP_ID set q = $modelEntry;

	return $record;

};

DEFINE FUNCTION OVERWRITE fn::addQuestionQtagTerm($payload: any) {
	return fn::createTerm("q", "qtag", $payload);
};

DEFINE FUNCTION OVERWRITE fn::removeQuestionQtagTerm($term: any) {
	return fn::removeTerm("q", "qtag", $term);
};

DEFINE FUNCTION OVERWRITE fn::attachQuestionQtagTerm($RID: any, $term: any, $options: option<object>) {
	return fn::attachTerm("q", "qtag", $RID, $term, $options);
};

DEFINE FUNCTION OVERWRITE fn::detachQuestionQtagTerm($RID: any, $term: any, $options: option<object>) {
	return fn::detachTerm("q", "qtag", $RID, $term, $options);
};

DEFINE FUNCTION OVERWRITE fn::getQuestionQtagTerms() {
	return fn::getTerms("q", "qtag");
};

DEFINE FUNCTION OVERWRITE fn::getQuestionQtags($RID: any) {
	return fn::getRecordTerms("q", "qtag", $RID);
};