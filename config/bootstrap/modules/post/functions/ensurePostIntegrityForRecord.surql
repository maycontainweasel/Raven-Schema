DEFINE FUNCTION overwrite fn::ensurePostIntegrityForRecord($RID: record) {
    if !type::is_record($RID) || !record::exists($RID) {
        throw "recreatePostForQuestion | expects a valid RID record";        
    };

    let $pid = fn::PID($RID);

    let $exists = fn::RIDExists($pid);

    return if($exists) {
        // check fro old post records and delete them if they exist

        // Confirm relationship
        let $relID = select value id from only Post where in = $pid;
        
        if(!fn::RIDExists($relID)) {
            fn::attachRecordToPost($RID);
        };
        
        // if they exist delete them
        delete (select * from Post where out = $RID);
        
    } else {
        fn::createPost({
            id: $RID,
            title: <string> record::id($RID),
            status: "publish"
        });

        fn::attachRecordToPost($RID);
    
    }
    
};