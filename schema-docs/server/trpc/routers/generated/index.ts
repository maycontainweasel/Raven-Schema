import { adminRouter } from '../admin';
import { apiAttemptRouter } from './apiAttempt';
import { questionRouter } from './question';
import { questionOptionRouter } from './questionoption';
import { questionRecordRouter } from './questionrecord';
import { questionOptionRecordRouter } from './questionoptionrecord';
import { userQuestionOptionRecordRouter } from './userquestionoptionrecord';
import { userRouter } from './user';
import { instanceRouter } from './instance';

export const generatedRouters = {
  "admin": adminRouter,
  "apiAttempt": apiAttemptRouter,
  "question": questionRouter,
  "questionOption": questionOptionRouter,
  "questionRecord": questionRecordRouter,
  "questionOptionRecord": questionOptionRecordRouter,
  "userQuestionOptionRecord": userQuestionOptionRecordRouter,
  "user": userRouter,
  "instance": instanceRouter,
};

export { adminRouter };
export { apiAttemptRouter };
export { questionRouter };
export { questionOptionRouter };
export { questionRecordRouter };
export { questionOptionRecordRouter };
export { userQuestionOptionRecordRouter };
export { userRouter };
export { instanceRouter };
