DEFINE FUNCTION OVERWRITE fn::createInstanceSettings($PARENT_ID: record<instance>, $payload: option<object>) {

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else {
		{}
	};

	if !type::is_record($PARENT_ID) {
		throw "createInstanceSettings | requires valid parent record";
	};
	if !$payloadInput.skipExists {
		if !record::exists($PARENT_ID) {
			throw "createInstanceSettings | requires valid parent record";
		};
	};
	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);

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
	let $record = if $record { $record } else {
		let $fallback = select * from only $RID;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};
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
