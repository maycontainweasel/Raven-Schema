DEFINE FUNCTION OVERWRITE fn::deleteProduct($ProductID: any) {

	let $rid = fn::ridParam("product", $ProductID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from OrderProduct where out = $rid;
	delete from OrderTrialProduct where out = $rid;
	delete from ProductOrders where out = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteProduct | failed to delete Product";
	}

};
