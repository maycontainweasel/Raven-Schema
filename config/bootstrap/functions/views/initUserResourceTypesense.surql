DEFINE FUNCTION fn::initUserResourceTypesense($UID: record) {
	
	if !$UID {
    THROW "initUserResourceTypesense | UID is required";
  };

	if !type::is_record($UID) || !record::exists($UID) {
		THROW "initUserResourceTypesense | UID doesn't exist";
	};

  return select *,
		
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
			select exam,exam_date from uExamDate where <-(UserExamDates where in = $UID)
		) as examDates,

		{
			return select 
				*,
				{
					let $UAccessID = $this.id;
					return select 
						create_datetime,
						expiry_datetime,
						start_datetime,
						({
							"id": $this.exam.id,
							"title": $this.exam.title,
							"titleShort": $this.exam.titleShort
						}) as exam
					from uSubscription where 
						<-(Subscriptions where in = $UAccessID)
						fetch exam;
				} as subscriptions,
				{
					let $UID = $this.id;
					return select exam, s,sessionComplete, startDate, sessionStartDate from only type::record('uTrial', $UID)
				} as trial
			from only type::record('uAccess', record::id($UID))
			
		} as access

    omit password, dateCreated

  from only $UID;

};