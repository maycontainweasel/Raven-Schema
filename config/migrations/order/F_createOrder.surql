DEFINE FUNCTION OVERWRITE fn::createOrder($payload: object) {

	if !$payload {
		throw "createOrder | payload is required";
	};

	let $subtable_orderItem = $payload.orderItem;
	let $subtable_orderEvent = $payload.orderEvent;

	let $payload = fn::objectRemove($payload, ["orderItem", "orderEvent"]);

	if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len($payload.u) = 0) {
		throw "createOrder | requires u";
	};

	let $defaultData = {
		u: "",
		uSubscription: "",
		exam: "",
		productID: "",
		variantID: "",
		extensionID: "",
		type: "product",
		status: "processing",
		currency: "",
		amountSubtotal: 0,
		amountTax: 0,
		amountDiscount: 0,
		amountTotal: 0,
		amountRefunded: 0,
		stripeID: "",
		stripeOrderID: "",
		paymentIntentID: "",
		checkoutSessionID: "",
		chargeID: "",
		customerID: "",
		invoiceID: "",
		paymentMethodID: "",
		stripePriceID: "",
		stripeProductID: "",
		subscriptionID: "",
		receiptURL: "",
		couponApplied: false,
		couponCode: "",
		items: [],
		access: {
			products: [],
			exams: [],
			from: "",
			to: "",
		},
		userSnapshot: {
			email: "",
			name: "",
		},
		paymentSnapshot: {
			brand: "",
			last4: "",
		},
		events: [],
		metadata: {},
		stripePayload: {},
		createdAt: time::now(),
		updatedAt: time::now(),
		instances: [],
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		u: if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { null } else { fn::ridParam("u", $payload.u) },
		uSubscription: if $payload.uSubscription = NONE || $payload.uSubscription = null || (type::is_string($payload.uSubscription) && string::len(string::trim($payload.uSubscription)) = 0) { null } else { fn::ridParam("uSubscription", $payload.uSubscription) },
		exam: if $payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0) { null } else { fn::ridParam("exam", $payload.exam) },
		productID: if $payload.productID = NONE || $payload.productID = null || (type::is_string($payload.productID) && string::len(string::trim($payload.productID)) = 0) { null } else { fn::ridParam("product", $payload.productID) },
		variantID: if $payload.variantID = NONE || $payload.variantID = null || (type::is_string($payload.variantID) && string::len(string::trim($payload.variantID)) = 0) { null } else { fn::ridParam("productVariant", $payload.variantID) },
		extensionID: if $payload.extensionID = NONE || $payload.extensionID = null || (type::is_string($payload.extensionID) && string::len(string::trim($payload.extensionID)) = 0) { null } else { fn::ridParam("extensionVariant", $payload.extensionID) },
		currency: if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { null } else { fn::ridParam("currency", $payload.currency) },
	});

	let $payload = fn::objectAssign($payload, {
		u: if type::is_array($payload.u) { $payload.u } else if $payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0) { $payload.u } else { fn::ridParam("u", $payload.u) },
		uSubscription: if type::is_array($payload.uSubscription) { $payload.uSubscription } else if $payload.uSubscription = NONE || $payload.uSubscription = null || (type::is_string($payload.uSubscription) && string::len(string::trim($payload.uSubscription)) = 0) { $payload.uSubscription } else { fn::ridParam("uSubscription", $payload.uSubscription) },
		exam: if type::is_array($payload.exam) { $payload.exam } else if $payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0) { $payload.exam } else { fn::ridParam("exam", $payload.exam) },
		productID: if type::is_array($payload.productID) { $payload.productID } else if $payload.productID = NONE || $payload.productID = null || (type::is_string($payload.productID) && string::len(string::trim($payload.productID)) = 0) { $payload.productID } else { fn::ridParam("product", $payload.productID) },
		variantID: if type::is_array($payload.variantID) { $payload.variantID } else if $payload.variantID = NONE || $payload.variantID = null || (type::is_string($payload.variantID) && string::len(string::trim($payload.variantID)) = 0) { $payload.variantID } else { fn::ridParam("productVariant", $payload.variantID) },
		extensionID: if type::is_array($payload.extensionID) { $payload.extensionID } else if $payload.extensionID = NONE || $payload.extensionID = null || (type::is_string($payload.extensionID) && string::len(string::trim($payload.extensionID)) = 0) { $payload.extensionID } else { fn::ridParam("extensionVariant", $payload.extensionID) },
		currency: if type::is_array($payload.currency) { $payload.currency } else if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0) { $payload.currency } else { fn::ridParam("currency", $payload.currency) },
	});

	if !($payload.u = NONE || $payload.u = null || (type::is_string($payload.u) && string::len(string::trim($payload.u)) = 0)) && (!type::is_record($payload.u) || !record::exists($payload.u)) {
		throw "createOrder | u must reference an existing u record";
	};
	let $payload = if !($payload.uSubscription = NONE || $payload.uSubscription = null || (type::is_string($payload.uSubscription) && string::len(string::trim($payload.uSubscription)) = 0)) && (!type::is_record($payload.uSubscription) || !record::exists($payload.uSubscription)) {
		fn::objectAssign($payload, {
			uSubscription: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.exam = NONE || $payload.exam = null || (type::is_string($payload.exam) && string::len(string::trim($payload.exam)) = 0)) && (!type::is_record($payload.exam) || !record::exists($payload.exam)) {
		fn::objectAssign($payload, {
			exam: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.productID = NONE || $payload.productID = null || (type::is_string($payload.productID) && string::len(string::trim($payload.productID)) = 0)) && (!type::is_record($payload.productID) || !record::exists($payload.productID)) {
		fn::objectAssign($payload, {
			productID: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.variantID = NONE || $payload.variantID = null || (type::is_string($payload.variantID) && string::len(string::trim($payload.variantID)) = 0)) && (!type::is_record($payload.variantID) || !record::exists($payload.variantID)) {
		fn::objectAssign($payload, {
			variantID: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.extensionID = NONE || $payload.extensionID = null || (type::is_string($payload.extensionID) && string::len(string::trim($payload.extensionID)) = 0)) && (!type::is_record($payload.extensionID) || !record::exists($payload.extensionID)) {
		fn::objectAssign($payload, {
			extensionID: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len(string::trim($payload.currency)) = 0)) && (!type::is_record($payload.currency) || !record::exists($payload.currency)) {
		fn::objectAssign($payload, {
			currency: NONE,
		})
	} else {
		$payload
	};

	if !type::is_array($payload.instances){
		throw "createOrder | requires valid instances array";
	};

	let $record = upsert order content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createOrder | failed to create order";
	};

	if type::is_array($subtable_orderItem) {
		let $subtable_index_orderItem_orderItem = 0;
		for $subtable_item_orderItem_orderItem in $subtable_orderItem {
			let $subtable_payload_orderItem_orderItem = if type::is_object($subtable_item_orderItem_orderItem) { $subtable_item_orderItem_orderItem } else if $subtable_item_orderItem_orderItem = NONE || $subtable_item_orderItem_orderItem = null { {} } else { { label: $subtable_item_orderItem_orderItem } };
			let $subtable_payload_orderItem_orderItem = if $subtable_payload_orderItem_orderItem.order = NONE {
				fn::objectAssign($subtable_payload_orderItem_orderItem, { order: $subtable_index_orderItem_orderItem })
			} else {
				$subtable_payload_orderItem_orderItem
			};
			fn::createOrderItem($recordID, fn::objectAssign($subtable_payload_orderItem_orderItem, { skipExists: true }));
			let $subtable_index_orderItem_orderItem = $subtable_index_orderItem_orderItem + 1;
		};
	} else if type::is_object($subtable_orderItem) || $subtable_orderItem {
		let $subtable_payload_orderItem_orderItem = if type::is_object($subtable_orderItem) { $subtable_orderItem } else if $subtable_orderItem = NONE || $subtable_orderItem = null { {} } else { { label: $subtable_orderItem } };
		let $subtable_payload_orderItem_orderItem = if $subtable_payload_orderItem_orderItem.order = NONE {
			fn::objectAssign($subtable_payload_orderItem_orderItem, { order: 0 })
		} else {
			$subtable_payload_orderItem_orderItem
		};
		fn::createOrderItem($recordID, fn::objectAssign($subtable_payload_orderItem_orderItem, { skipExists: true }));
	};

	if type::is_array($subtable_orderEvent) {
		let $subtable_index_orderEvent_orderEvent = 0;
		for $subtable_item_orderEvent_orderEvent in $subtable_orderEvent {
			let $subtable_payload_orderEvent_orderEvent = if type::is_object($subtable_item_orderEvent_orderEvent) { $subtable_item_orderEvent_orderEvent } else if $subtable_item_orderEvent_orderEvent = NONE || $subtable_item_orderEvent_orderEvent = null { {} } else { { title: $subtable_item_orderEvent_orderEvent } };
			let $subtable_payload_orderEvent_orderEvent = if $subtable_payload_orderEvent_orderEvent.order = NONE {
				fn::objectAssign($subtable_payload_orderEvent_orderEvent, { order: $subtable_index_orderEvent_orderEvent })
			} else {
				$subtable_payload_orderEvent_orderEvent
			};
			fn::createOrderEvent($recordID, fn::objectAssign($subtable_payload_orderEvent_orderEvent, { skipExists: true }));
			let $subtable_index_orderEvent_orderEvent = $subtable_index_orderEvent_orderEvent + 1;
		};
	} else if type::is_object($subtable_orderEvent) || $subtable_orderEvent {
		let $subtable_payload_orderEvent_orderEvent = if type::is_object($subtable_orderEvent) { $subtable_orderEvent } else if $subtable_orderEvent = NONE || $subtable_orderEvent = null { {} } else { { title: $subtable_orderEvent } };
		let $subtable_payload_orderEvent_orderEvent = if $subtable_payload_orderEvent_orderEvent.order = NONE {
			fn::objectAssign($subtable_payload_orderEvent_orderEvent, { order: 0 })
		} else {
			$subtable_payload_orderEvent_orderEvent
		};
		fn::createOrderEvent($recordID, fn::objectAssign($subtable_payload_orderEvent_orderEvent, { skipExists: true }));
	};


	return if $record {
		return $record;
	} else {
		throw "createOrder | failed to create order";
	}

};

