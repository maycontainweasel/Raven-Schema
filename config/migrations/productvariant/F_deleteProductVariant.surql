DEFINE FUNCTION OVERWRITE fn::deleteProductVariant($ProductVariantID: any) {

	let $rid = fn::ridParam("productVariant", $ProductVariantID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from OrderProductVariant where out = $rid;
	delete from ProductVariants where out = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteProductVariant | failed to delete ProductVariant";
	}

};
