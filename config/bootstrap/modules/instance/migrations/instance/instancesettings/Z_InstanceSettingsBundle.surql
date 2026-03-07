-- ========================================
-- Table Bundle: InstanceSettings
-- ========================================

-- ---------- FUNCTIONS ----------

-- File: F_createInstanceSettings.surql
DEFINE FUNCTION OVERWRITE fn::createInstanceSettings($PARENT_ID: any, $payload: option<object>) {

	let $payloadInput = if type::is_object($payload) {
		$payload
	} else if type::is_object($PARENT_ID) && !type::is_record($PARENT_ID) {
		$PARENT_ID
	} else {
		{}
	};

	let $parentInput = if type::is_record($PARENT_ID) {
		$PARENT_ID
	} else if !type::is_object($PARENT_ID) && $PARENT_ID != NONE && $PARENT_ID != null && (!type::is_string($PARENT_ID) || string::len($PARENT_ID) > 0) {
		$PARENT_ID
	} else {
		NONE
	};

	let $PARENT_ID = fn::ridParam("instance", $parentInput);
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
		content: {},
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

-- File: F_deleteInstanceSettings.surql
DEFINE FUNCTION OVERWRITE fn::deleteInstanceSettings($InstanceSettingsID: any) {

	let $rid = fn::ridParam("instanceSettings", $InstanceSettingsID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "instance" { type::record("instanceSettings", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteInstanceSettings | failed to delete InstanceSettings";
	}

};

-- File: F_updateInstanceSettings.surql
DEFINE FUNCTION OVERWRITE fn::updateInstanceSettings($InstanceSettingsID: any, $payload: object) {

	let $rid = fn::ridParam("instanceSettings", $InstanceSettingsID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "instance" { type::record("instanceSettings", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateInstanceSettings | payload is required";
	};

	let $current = (select * from $rid)[0];

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

	return if $result {
		return $result;
	} else {
		throw "updateInstanceSettings | failed to update InstanceSettings";
	}

};


-- ---------- EVENTS ----------

-- File: E_InstanceSettingsDelete.surql
DEFINE EVENT OVERWRITE InstanceSettingsDelete ON TABLE instanceSettings WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'InstanceSettings', false);
};


-- ---------- EDGES ----------

-- File: L_instanceSettingsEdges.surql
DEFINE TABLE OVERWRITE InstanceSettings SCHEMAFULL TYPE RELATION IN instance OUT instanceSettings;
DEFINE FIELD OVERWRITE in ON TABLE InstanceSettings TYPE record<instance>;
DEFINE FIELD OVERWRITE out ON TABLE InstanceSettings TYPE record<instanceSettings>;
DEFINE INDEX OVERWRITE InstanceSettings_unique ON TABLE InstanceSettings FIELDS in, out UNIQUE;

