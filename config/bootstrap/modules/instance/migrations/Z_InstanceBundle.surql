-- ========================================
-- Table Bundle: Instance
-- ========================================

-- ---------- FUNCTIONS ----------

-- File: F_createInstance.surql
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

-- File: F_deleteInstance.surql
DEFINE FUNCTION OVERWRITE fn::deleteInstance($InstanceID: any) {

	let $rid = fn::ridParam("instance", $InstanceID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteInstance | failed to delete Instance";
	}

};

-- File: F_updateInstance.surql
DEFINE FUNCTION OVERWRITE fn::updateInstance($InstanceID: any, $payload: object) {

	let $rid = fn::ridParam("instance", $InstanceID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateInstance | payload is required";
	};

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
		throw "updateInstance | failed to update Instance";
	}

};


-- ---------- EVENTS ----------

-- File: E_InstanceDelete.surql
DEFINE EVENT OVERWRITE InstanceDelete ON TABLE instance WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteInstanceSettings(type::record('instanceSettings', record::id($id)));
  fn::deleteEdgeFromIn($id, 'InstanceSettings', false);
  fn::deleteEdgeFromIn($id, 'Instances', false);
};

-- File: E_InstancePostCreate.surql
DEFINE EVENT OVERWRITE InstancePostCreate ON TABLE instance WHEN $event = "CREATE" THEN { let $RID = $after.id;
if !type::is_record($RID) { throw "InstancePostCreate | invalid record id"; };

fn::createPost({
  id: $RID,
  title: record::id($RID)
});
let $PID = fn::PID($RID);
fn::createEdge($PID, "Post", $RID, { boundId: true, overwrite: false, skipExists: true });

if($after.status == 'publish') {
  fn::updatePost($PID, {
    "publishedAt": time::now()
  });
} else {
  fn::updatePost($PID, {
    "publishedAt": null
  });
} };

-- File: E_InstancePostDelete.surql
DEFINE EVENT OVERWRITE InstancePostDelete ON TABLE instance WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "InstancePostDelete | invalid record id"; };
let $PID = fn::PID($RID);
fn::deleteEdge($PID, "Post", $RID, { boundId: true });
fn::deletePost($PID) };

-- File: E_InstancePostUpdate.surql
DEFINE EVENT OVERWRITE InstancePostUpdate ON TABLE instance WHEN $event = "UPDATE" THEN { let $RID = $after.id;
if !type::is_record($RID) { throw "InstancePostUpdate | invalid record id"; };
let $PID = fn::PID($RID);

if($after.status == "publish" and $before.status != "publish") {
  let $time = time::now();
  fn::updatePost($PID, {
    "updatedAt": $time,
    "publishedAt": $time
  });
} else if $after.status != "publish" {
  fn::updatePost($PID, {
    "updatedAt": time::now(),
    "publishedAt": null
  });
} };

-- File: E_InstancesCreate.surql
DEFINE EVENT OVERWRITE InstancesCreate ON TABLE instance WHEN $event = "CREATE" THEN { if (type::is_array($after.instances) and array::len($after.instances) > 0) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "InstancesCreate | invalid record id"; };
  for $instanceCode in $after.instances {
    let $instanceID = type::record("instance", $instanceCode);
    if !fn::RIDExists($instanceID) { throw "InstancesCreate | invalid instance id"; };
    fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
  };
} };

-- File: E_InstancesDelete.surql
DEFINE EVENT OVERWRITE InstancesDelete ON TABLE instance WHEN $event = "DELETE" THEN { let $RID = $before.id;
if !type::is_record($RID) { throw "InstancesDelete | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances") };

-- File: E_InstancesUpdate.surql
DEFINE EVENT OVERWRITE InstancesUpdate ON TABLE instance WHEN $event = "UPDATE" THEN { if ($after.instances != $before.instances) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "InstancesUpdate | invalid record id"; };
  fn::clearEdgesForRecord($RID, "Instances");

  if (type::is_array($after.instances) and array::len($after.instances) > 0) {
    for $instanceCode in $after.instances {
      let $instanceID = type::record("instance", $instanceCode);
      if !fn::RIDExists($instanceID) { throw "InstancesUpdate | invalid instance id"; };
      fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
    };
  };
} };


-- ---------- VIEWS ----------

-- File: V_InstanceAdmin.surql
DEFINE TABLE IF NOT EXISTS instance TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE InstanceAdmin TYPE NORMAL AS
SELECT
    id,
    key,
    instance,
    title,
    status,
    active,
    (select * from only type::record('instanceSettings', record::id($this.id))) AS settings
FROM instance;


-- ---------- INDEXES ----------

-- File: I_InstanceInstanceKey.surql
DEFINE INDEX OVERWRITE InstanceKey ON TABLE instance
  FIELDS key
  UNIQUE
  COMMENT "Ensures each instance key is unique";


-- ---------- EDGES ----------

-- File: L_instanceEdges.surql
DEFINE TABLE OVERWRITE Instances SCHEMAFULL TYPE RELATION OUT instance;
DEFINE FIELD OVERWRITE in ON TABLE Instances;
DEFINE FIELD OVERWRITE out ON TABLE Instances TYPE record<instance>;
DEFINE INDEX OVERWRITE Instances_unique ON TABLE Instances FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE InstanceSettings SCHEMAFULL TYPE RELATION IN instance OUT instanceSettings;
DEFINE FIELD OVERWRITE in ON TABLE InstanceSettings TYPE record<instance>;
DEFINE FIELD OVERWRITE out ON TABLE InstanceSettings TYPE record<instanceSettings>;
DEFINE INDEX OVERWRITE InstanceSettings_unique ON TABLE InstanceSettings FIELDS in, out UNIQUE;

