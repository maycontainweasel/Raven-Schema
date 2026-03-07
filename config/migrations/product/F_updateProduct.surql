DEFINE FUNCTION OVERWRITE fn::updateProduct($ProductID: any, $payload: object) {

	let $rid = fn::ridParam("product", $ProductID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateProduct | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $rel_product = $payload.product;
	let $rel_trialProduct = $payload.trialProduct;
	let $rel_products = $payload.products;

	let $payload = fn::objectRemove($payload, ["product", "trialProduct", "products"]);

	let $rel_product_norm = fn::toRecordArray('order', $rel_product);
	let $rel_trialProduct_norm = fn::toRecordArray('order', $rel_trialProduct);
	let $rel_products_norm = fn::toRecordArray('order', $rel_products);

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

	if type::is_array($rel_product) {
		if array::len($rel_product_norm) > 1 {
			throw "attach:OrderProduct | expects single relation";
		};
	delete from OrderProduct where out = $rid;
		if array::len($rel_product_norm) == 1 {
			fn::createEdge(array::first($rel_product_norm), "OrderProduct", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_product {
	delete from OrderProduct where out = $rid;
		if array::len($rel_product_norm) > 0 {
			fn::createEdge(array::first($rel_product_norm), "OrderProduct", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_trialProduct) {
		if array::len($rel_trialProduct_norm) > 1 {
			throw "attach:OrderTrialProduct | expects single relation";
		};
	delete from OrderTrialProduct where out = $rid;
		if array::len($rel_trialProduct_norm) == 1 {
			fn::createEdge(array::first($rel_trialProduct_norm), "OrderTrialProduct", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_trialProduct {
	delete from OrderTrialProduct where out = $rid;
		if array::len($rel_trialProduct_norm) > 0 {
			fn::createEdge(array::first($rel_trialProduct_norm), "OrderTrialProduct", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};

	if type::is_array($rel_products) {
	delete from ProductOrders where out = $rid;
		for $rel in $rel_products_norm {
			fn::createEdge($rel, "ProductOrders", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_products {
	delete from ProductOrders where out = $rid;
		for $rel in $rel_products_norm {
			fn::createEdge($rel, "ProductOrders", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateProduct | failed to update Product";
	}

};
