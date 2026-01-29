import { createInstanceController } from './instance'
import { createPostController } from './post'
import { createQuestionController } from './question'
import { createQuestionOptionController } from './questionOption'
import { createQuestionOptionRecordController } from './questionOptionRecord'
import { createQuestionRecordController } from './questionRecord'
import { createInstanceSettingsController } from './settings'
import { createUserController } from './user'
import { createUserQuestionOptionRecordController } from './userQuestionOptionRecord'
import type { InstanceController } from './instance'
import type { PostController } from './post'
import type { QuestionController } from './question'
import type { QuestionOptionController } from './questionOption'
import type { QuestionOptionRecordController } from './questionOptionRecord'
import type { QuestionRecordController } from './questionRecord'
import type { InstanceSettingsController } from './settings'
import type { UserController } from './user'
import type { UserQuestionOptionRecordController } from './userQuestionOptionRecord'

export type ControllersMap = {
  instance: InstanceController;
  post: PostController;
  question: QuestionController;
  questionOption: QuestionOptionController;
  questionOptionRecord: QuestionOptionRecordController;
  questionRecord: QuestionRecordController;
  settings: InstanceSettingsController;
  user: UserController;
  userQuestionOptionRecord: UserQuestionOptionRecordController;
}

export function createControllers(): ControllersMap {
  return {
  instance: createInstanceController(),
  post: createPostController(),
  question: createQuestionController(),
  questionOption: createQuestionOptionController(),
  questionOptionRecord: createQuestionOptionRecordController(),
  questionRecord: createQuestionRecordController(),
  settings: createInstanceSettingsController(),
  user: createUserController(),
  userQuestionOptionRecord: createUserQuestionOptionRecordController(),
  }
}
