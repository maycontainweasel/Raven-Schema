import { adminRouter } from '../admin';
import { apiAttemptRouter } from './apiAttempt';
import { carRouter } from './car';
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
  "car": carRouter,
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
export { carRouter };
export { questionRouter };
export { questionOptionRouter };
export { questionRecordRouter };
export { questionOptionRecordRouter };
export { userQuestionOptionRecordRouter };
export { userRouter };
export { instanceRouter };
