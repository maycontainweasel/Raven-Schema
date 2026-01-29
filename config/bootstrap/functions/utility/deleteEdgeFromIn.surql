DEFINE FUNCTION fn::deleteEdgeFromIn($RID_IN: record, $table: string, $deleteTargets: bool, $deleteTargetType: option<string>) {
	
	
	if !$RID_IN {
		throw 'deleteEdgeFromIn | $RID_IN is not defined';
	};
	if !$table {
		throw 'deleteEdgeFromIn | table not defined';
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
	let $T_ID = array::first(select value id from type::table($table) where in = $RID_IN);
	
	// Confirm the source record exists
	return if (type::is_record($T_ID) && record::exists($T_ID)) {
		// The record actually exists, proceed
		
		return if($deleteTargets) { // Delete record or records

			if($deleteTargetType == 'array') { // Deleting an array of records, therefore return an array of the deleted records for further processing
				
				let $R_IDs = select value id from type::table($table) where in = $RID_IN;
				
				return $R_IDs;
				/*
				return if(type::is_array($R_IDs)) {
					return delete $R_IDs return BEFORE;
				} else {
					return [];
				};
				*/
				
			} else { // Deleting a single record
				
				return if type::is_record($R_ID) && record::exists($R_ID) {
					return delete only $R_ID return BEFORE;
				} else {
					return null;
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
