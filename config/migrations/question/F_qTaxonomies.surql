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
		createOnAttach: true,
		generateNamedFunctions: false,
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
		createOnAttach: true,
		generateNamedFunctions: false,
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

DEFINE FUNCTION OVERWRITE fn::createQuestionQtopicTaxonomy($payload: option<object>) {

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else {
		{}
	};

	let $defaultData = {
		key: "qtopic",
		label: "Topic",
		labelPlural: "Topics",
		permalink: "qtopic",
		description: "Question topics",
		hierarchical: false,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	if !$payload.permalink || $payload.permalink == "" {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.key) });
	} else {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.permalink) });
	};

	let $RID = type::record('tax', fn::stringID(["q", "qtopic"]));
	let $record = upsert $RID merge $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $registryPayload = {
		key: "qtopic",
		labels: { singular: "Topic", plural: "Topics" },
		model: "q",
		taxonomyModel: "tax",
		termModel: "t_q_qtopic",
		taxonomyRid: $RID,
		taxonomyIdSpec: "stringID<q, qtopic>",
		termIdSpec: "<field:key>",
		edgeRecordToTerm: "QuestionQtopics",
		edgeTaxonomyToTerm: "QuestionQtopicTerms",
		cardinality: "many",
		storeOnModel: false,
		createOnAttach: true,
		generateNamedFunctions: false,
		payloadField: "topics",
		payloadAliases: [],
		required: false,
		processor: "functions",
		hierarchical: true,
		taxonomyDefaults: {
  key: "qtopic",
  label: "Topic",
  labelPlural: "Topics",
  permalink: "qtopic",
  description: "Question topics",
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
	let $taxMap = fn::objectAssign($taxMap, { "qtopic": $registryPayload });
	let $modelEntry = fn::objectAssign($modelEntry, { taxonomies: $taxMap });
	upsert $APP_ID set q = $modelEntry;

	return $record;

};