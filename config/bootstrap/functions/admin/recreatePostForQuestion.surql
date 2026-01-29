DEFINE FUNCTION fn::recreatePostForQuestion($PID: record) {
    if !type::is_record($PID) || !record::exists($PID) {
        throw "recreatePostForQuestion | expects a valid PID record";        
    };

    let $createdAt = select value create_date from only $PID;

    let $id = record::id($PID);
    let $contentTable = $id[0];
    let $questionId = $id[1];

    let $newPid = type::record("p", fn::stringID([$contentTable, $questionId]));


    if(!record::exists($newPid) && $contentTable && $questionId) {
        fn::createPost({
            id: $newPid,
            title: <string> $questionId,
            status: "publish",
            createdAt: $createdAt,
        });
    
        fn::attachRecordToPost($newPid);
    
        // delete realtionship
        select * from Post where in = $PID;
    
        // delete old post
        delete $PID;
    
    };
    
};