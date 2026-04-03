import { createPostController } from './post'
import { createUserController } from './user'
import type { PostController } from './post'
import type { UserController } from './user'

export type ControllersMap = {
  post: PostController;
  user: UserController;
}

export function createControllers(): ControllersMap {
  return {
  post: createPostController(),
  user: createUserController(),
  }
}
