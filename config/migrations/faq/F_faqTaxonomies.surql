DEFINE FUNCTION OVERWRITE fn::createFAQFaqCategoryTaxonomy($payload: option<object>) {

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else {
		{}
	};

	let $defaultData = {
		key: "faqCategory",
		label: "Category",
		labelPlural: "Categories",
		permalink: "faqcategory",
		description: "FAQ categories",
		hierarchical: false,
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	if !$payload.permalink || $payload.permalink == "" {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.key) });
	} else {
		let $payload = fn::objectAssign($payload, { permalink: string::slug($payload.permalink) });
	};

	let $RID = type::record('tax', fn::stringID(["faq", "faqCategory"]));
	let $record = upsert $RID merge $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $registryPayload = {
		key: "faqCategory",
		labels: { singular: "Category", plural: "Categories" },
		model: "faq",
		taxonomyModel: "tax",
		termModel: "t_faq_faqcategory",
		taxonomyRid: $RID,
		taxonomyIdSpec: "stringID<faq, faqCategory>",
		termIdSpec: "<field:key>",
		edgeRecordToTerm: "FAQFaqCategorys",
		edgeTaxonomyToTerm: "FAQFaqCategoryTerms",
		cardinality: "many",
		storeOnModel: true,
		createOnAttach: true,
		generateNamedFunctions: false,
		payloadField: "faqCategorys",
		payloadAliases: [],
		required: false,
		processor: "functions",
		hierarchical: false,
		taxonomyDefaults: {
  key: "faqCategory",
  label: "Category",
  labelPlural: "Categories",
  permalink: "faqcategory",
  description: "FAQ categories",
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
	let $modelEntry = $app["faq"] ?? {};
	let $taxMap = $modelEntry.taxonomies ?? {};
	let $taxMap = fn::objectAssign($taxMap, { "faqCategory": $registryPayload });
	let $modelEntry = fn::objectAssign($modelEntry, { taxonomies: $taxMap });
	upsert $APP_ID set faq = $modelEntry;

	return $record;

};