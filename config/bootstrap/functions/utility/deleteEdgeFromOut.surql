DEFINE FUNCTION fn::deleteEdgeFromOut($RID_OUT: record, $table: string, $deleteTargets: bool, $deleteTargetType: option<string>) {
	
	
	if !$RID_OUT {
		throw 'deleteEdgeFromOut | $RID_OUT is not defined';
	};
	if !$table {
		throw 'deleteEdgeFromOut | table not defined';
	};

	let $deleteTargets = if $deleteTargets == true {
		true;
	} else {
		false;
	};

	let $deleteTargetType = if type::is_string($deleteTargetType) {
		if($deleteTargetType == 'array') {
			"array";
		} else {
			"single";
		};
	} else {
		"single";
	};
	
	// Source Record (The record from which we find the related records), from "target"
	let $T_ID = array::first(select value id from type::table($table) where out = $RID_OUT);


	// Confirm the source record exists
	return if (type::is_record($T_ID) && record::exists($T_ID)) {
		
		return if($deleteTargets) {
			
			if($deleteTargetType == 'array') { // Deleting an array of records, therefore return an array of the deleted records for further processing
				
				let $R_IDs = select value id from type::table($table) where out = $RID_OUT;
				
				return if(type::is_array($R_IDs)) {
					return delete $R_IDs return BEFORE;
				} else {
					return [];
				};
				
			} else { // deleting a single record
				
				// We found the relationship record by using out to find it, if we're deleting the relationship we need to dlete the in record.
				let $R_ID = select value id from only $T_ID.in;	
				
				return if type::is_record($R_ID) && record::exists($R_ID) {
					return delete only $R_ID return BEFORE;
				} else {
					return $R_ID;
				};

			};
			
		} else {
			// Delete the relationship record
			return delete only $T_ID return BEFORE;
		};
		
	} else {
		return null;
	};

};