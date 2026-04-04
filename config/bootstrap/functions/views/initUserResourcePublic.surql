DEFINE FUNCTION OVERWRITE fn::initUserResourcePublic($UID: record) {
	if !$UID {
		THROW "initUserResourcePublic | UID is required";
	};

	if !type::is_record($UID) || !record::exists($UID) {
		THROW "initUserResourcePublic | UID doesn't exist";
	};

	let $ResolvedAccess = fn::reconcileUserAccess($UID);
	let $TrialID = type::record('uTrial', record::id($UID));
	let $Resource = select *, (<string> $this.id) as id,
		(
			select * from only type::record('uSettings', record::id($UID))
		) as settings,
		(
			select * from only type::record('uState', record::id($UID))
		) as state,
		(
			select *,
				{
					return if ($this.country && type::is_record(<record> $this.country)) {
						return select * from only <record> $this.country;
					} else {
						return {
							code: "",
							id: "",
							name: ""
						};
					}
				} as country
			from only type::record('uProfile', record::id($UID))
		) as profile,
		{
			return select *, (<string> $this.id) as id,
				{
					<string> $this.create_date
				} as create_date,
				{
					<string> $this.last_updated
				} as last_updated
			from only type::record('p', ['u', record::id($UID)]);
		} as post,
		(
			select value instance from only type::record('instance', 'local')
		) as instance,
		(
			select *,(<string> $this.id) as id, (select title, titleShort, id from only $this.exam) as exam from uExamDate where <-(UserExamDate where in = $UID)
		) as examDates
			omit password, dateCreated
	from only $UID fetch role;
	let $Resource = if type::is_array($Resource) { array::first($Resource) } else { $Resource };

	return fn::objectAssign($Resource, {
		"access": {
			"access": if type::is_object($ResolvedAccess) && type::is_string($ResolvedAccess.access) { $ResolvedAccess.access } else { "none" },
			"subscriptions": fn::userAccessibleSubscriptions($UID),
			"trial": if record::exists($TrialID) {
				select *,
					(<string> $this.id) as id,
					(<string> $this.u) as u,
					{
						return if type::is_record($this.s) {
							<string> $this.s
						} else if type::is_string($this.s) {
							string::trim($this.s)
						} else {
							""
						};
					} as s,
					{
						return if type::is_record($this.s) {
							<string> $this.s
						} else if type::is_string($this.s) {
							string::trim($this.s)
						} else {
							""
						};
					} as sid,
					{
						return <string> $this.startDate;
					} as startDate,
					{
						return <string> $this.sessionCompleteDate;
					} as sessionCompleteDate,
					{
						return <string> $this.sessionStartDate;
					} as sessionStartDate
				from only $TrialID
			} else {
				NONE
			}
		}
	});
};
