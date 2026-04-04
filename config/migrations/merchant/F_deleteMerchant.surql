DEFINE FUNCTION OVERWRITE fn::deleteMerchant($MerchantID: any) {

	let $rid = fn::ridParam("merchant", $MerchantID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteMerchant | failed to delete Merchant";
	}

};
