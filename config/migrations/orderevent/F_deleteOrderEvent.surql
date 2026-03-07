DEFINE FUNCTION OVERWRITE fn::deleteOrderEvent($OrderEventID: any) {

	let $rid = fn::ridParam("orderEvent", $OrderEventID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteOrderEvent | failed to delete OrderEvent";
	}

};
