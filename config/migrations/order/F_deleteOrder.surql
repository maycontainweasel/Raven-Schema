DEFINE FUNCTION OVERWRITE fn::deleteOrder($OrderID: any) {

	let $rid = fn::ridParam("order", $OrderID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteOrder | failed to delete Order";
	}

};
