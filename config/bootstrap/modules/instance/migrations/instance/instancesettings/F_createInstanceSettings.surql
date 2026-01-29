DEFINE FUNCTION OVERWRITE fn::createInstanceSettings($PARENT_ID: record<instance>, $payload: option<object>) {

	if !type::is_record($PARENT_ID) || !record::exists($PARENT_ID) {
		throw "createInstanceSettings | requires valid parent record";
	};

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else {
		{}
	};

	let $defaultData = {
		currencies: [],
		currencyCatalog: [],
		defaultCurrency: "",
		flag: "",
		description: "",
		domains: [],
		primaryDomain: "",
		locale: "en-GB",
		timezone: "Europe/London",
		currency: "GBP",
		pricingOptions: "[1, 2, 3, 6]",
		content: "",
	};

	let $payload = fn::objectAssign($defaultData, $payloadInput);

	let $RID = type::record('instanceSettings', record::id($PARENT_ID));

	let $record = upsert $RID content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };
	let $recordID = if $record.id { $record.id } else { $record };

	if !$recordID {
		throw "createInstanceSettings | failed to create instanceSettings";
	};

	let $relation0 = (select * from InstanceSettings where in = $PARENT_ID and out = $recordID);
	if !$relation0 || array::len($relation0) = 0 {
		relate only $PARENT_ID->InstanceSettings->$recordID;
	};

	return $recordID;

};
