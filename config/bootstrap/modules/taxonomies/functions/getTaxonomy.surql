DEFINE FUNCTION overwrite fn::getTaxonomy($table: string, $tax: string ) {
	
	let $taxID = type::record("tax", fn::stringID([$table, $tax]));

	if(type::is_record($taxID) && record::exists($taxID)) {
		return $taxID;
	} else {
		return null;
	};	

};