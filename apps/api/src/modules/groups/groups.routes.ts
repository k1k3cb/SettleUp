import { Router } from "express";
import { groupsController } from "./groups.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  createGroupSchema,
  updateGroupSchema,
  joinGroupSchema,
  groupIdParamSchema,
} from "./groups.schemas.js";

export const groupsRouter: Router = Router();

groupsRouter.use(authenticate);

groupsRouter.get("/", groupsController.list);

groupsRouter.post(
  "/",
  validate({ body: createGroupSchema }),
  groupsController.create,
);

groupsRouter.post(
  "/join",
  validate({ body: joinGroupSchema }),
  groupsController.join,
);

groupsRouter.get(
  "/:id",
  validate({ params: groupIdParamSchema }),
  groupsController.getById,
);

groupsRouter.patch(
  "/:id",
  validate({ params: groupIdParamSchema, body: updateGroupSchema }),
  groupsController.update,
);

groupsRouter.delete(
  "/:id",
  validate({ params: groupIdParamSchema }),
  groupsController.remove,
);
