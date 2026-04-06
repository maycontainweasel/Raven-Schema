DEFINE FUNCTION OVERWRITE fn::initUserResourceTypesense($UID: record) {
	
	if !$UID {
    THROW "initUserResourceTypesense | UID is required";
  };

	if !type::is_record($UID) || !record::exists($UID) {
		THROW "initUserResourceTypesense | UID doesn't exist";
	};

	let $ResolvedAccess = fn::reconcileUserAccess($UID);
	let $TrialID = type::record('uTrial', record::id($UID));
	let $Resource = select *,
		
		(
			select currency,lastCheckout from only type::record('uState', $this.id)
    ) as state,
		(
      select levelOfTraining, 
				{
					return if (type::is_record($this.country) && record::exists($this.country)) {
						return select * from only $this.country;
					} else {
						return {
							code: "",
							id: "",
							name: ""
						};
					}
				} as country 
				from only type::record('uProfile', $this.id) 
		) as profile,
{
      return select id,create_date,last_updated,status from only type::record('p', ['u', record::id($UID)]);
    } as post,

		(
			select value instance from only type::record('instance', 'local')
		) as instance,

		(
			select exam, examDate from uExamDate where <-(UserExamDate where in = $UID)
		) as examDates
    omit password, dateCreated

  from only $UID;
	let $Resource = if type::is_array($Resource) { array::first($Resource) } else { $Resource };

	return fn::objectAssign($Resource, {
		"access": {
			"access": if type::is_object($ResolvedAccess) && type::is_string($ResolvedAccess.access) { $ResolvedAccess.access } else { "none" },
			"subscriptions": fn::userAccessibleSubscriptions($UID),
			"trial": if record::exists($TrialID) {
				select exam, s, sessionComplete, sessionCompleteDate, sessionStarted, sessionStartDate, startDate from only $TrialID
			} else {
				NONE
			}
		}
	});

};
