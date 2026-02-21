DEFINE FUNCTION OVERWRITE fn::createInstance($payload: object) {

	if !$payload {
		throw "createInstance | payload is required";
	};

	let $subtable_instanceSettings = $payload.instanceSettings;

	let $payload = fn::objectRemove($payload, ["instanceSettings"]);

	if $payload.key = NONE || $payload.key = null || (type::is_string($payload.key) && string::len($payload.key) = 0) {
		throw "createInstance | requires key";
	};
	if $payload.title = NONE || $payload.title = null || (type::is_string($payload.title) && string::len($payload.title) = 0) {
		throw "createInstance | requires title";
	};

	let $defaultData = {
		key: "",
		instance: $payload.key,
		title: "",
		status: "active",
		active: true,
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $rid = type::record('instance', $payload.key);
	let $payload = fn::objectRemove($payload, ["id"]);
	let $record = upsert $rid content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $record = if $record { $record } else {
		let $fallback = select * from only $rid;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createInstance | failed to create instance";
	};

	if type::is_array($subtable_instanceSettings) {
		if array::len($subtable_instanceSettings) > 0 {
			let $subtable_item_instanceSettings_instanceSettings = array::first($subtable_instanceSettings);
			let $subtable_payload_instanceSettings_instanceSettings = if type::is_object($subtable_item_instanceSettings_instanceSettings) { $subtable_item_instanceSettings_instanceSettings } else if $subtable_item_instanceSettings_instanceSettings = NONE || $subtable_item_instanceSettings_instanceSettings = null { {} } else { { currencies: $subtable_item_instanceSettings_instanceSettings } };
			fn::createInstanceSettings($recordID, fn::objectAssign($subtable_payload_instanceSettings_instanceSettings, { skipExists: true }));
		} else if true {
			fn::createInstanceSettings($recordID, { skipExists: true });
		};
	} else if type::is_object($subtable_instanceSettings) || $subtable_instanceSettings {
		let $subtable_payload_instanceSettings_instanceSettings = if type::is_object($subtable_instanceSettings) { $subtable_instanceSettings } else if $subtable_instanceSettings = NONE || $subtable_instanceSettings = null { {} } else { { currencies: $subtable_instanceSettings } };
		fn::createInstanceSettings($recordID, fn::objectAssign($subtable_payload_instanceSettings_instanceSettings, { skipExists: true }));
	} else if true {
		fn::createInstanceSettings($recordID, { skipExists: true });
	};


	return if $record {
		return $record;
	} else {
		throw "createInstance | failed to create instance";
	}

};

