DEFINE FUNCTION OVERWRITE fn::deleteOrderItem($OrderItemID: any) {

	let $rid = fn::ridParam("orderItem", $OrderItemID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteOrderItem | failed to delete OrderItem";
	}

};
