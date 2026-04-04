DEFINE FUNCTION OVERWRITE fn::updateClassificationRule($ClassificationRuleID: any, $payload: object) {

	let $rid = fn::ridParam("classificationRule", $ClassificationRuleID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateClassificationRule | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE { $current.space } else if type::is_array($payload.space) { $payload.space } else if $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
		targetMerchant: if $payload.targetMerchant = NONE { $current.targetMerchant } else if type::is_array($payload.targetMerchant) { $payload.targetMerchant } else if $payload.targetMerchant = null || (type::is_string($payload.targetMerchant) && string::len(string::trim($payload.targetMerchant)) = 0) { $payload.targetMerchant } else { fn::ridParam("merchant", $payload.targetMerchant) },
		targetCategory: if $payload.targetCategory = NONE { $current.targetCategory } else if type::is_array($payload.targetCategory) { $payload.targetCategory } else if $payload.targetCategory = null || (type::is_string($payload.targetCategory) && string::len(string::trim($payload.targetCategory)) = 0) { $payload.targetCategory } else { fn::ridParam("category", $payload.targetCategory) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "updateClassificationRule | space must reference an existing financialSpace record";
	};
	let $payload = if !($payload.targetMerchant = NONE || $payload.targetMerchant = null || (type::is_string($payload.targetMerchant) && string::len(string::trim($payload.targetMerchant)) = 0)) && (!type::is_record($payload.targetMerchant) || !record::exists($payload.targetMerchant)) {
		fn::objectAssign($payload, {
			targetMerchant: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.targetCategory = NONE || $payload.targetCategory = null || (type::is_string($payload.targetCategory) && string::len(string::trim($payload.targetCategory)) = 0)) && (!type::is_record($payload.targetCategory) || !record::exists($payload.targetCategory)) {
		fn::objectAssign($payload, {
			targetCategory: NONE,
		})
	} else {
		$payload
	};

	if $payload.scope != NONE {
		if !($payload.scope IN ["description", "merchant", "reference", "amount"]) {
			throw "updateClassificationRule | invalid scope";
		};
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
		throw "updateClassificationRule | failed to update ClassificationRule";
	}

};
