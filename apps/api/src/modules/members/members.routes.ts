import { Router } from "express";
import { MembersService } from "./members.service.js";
import { MembersRepository } from "./members.repository.js";
import { GroupsRepository } from "../groups/groups.repository.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { groupIdOnlyParamSchema } from "../groups/groups.schemas.js";

const membersService = new MembersService(
  new MembersRepository(),
  new GroupsRepository(),
);

const requireUserId = (req: { session?: { user: { id: string } } }): string => {
  const userId = req.session?.user.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
};

/**
 * Anidado bajo /groups/:groupId/members en app.ts.
 * mergeParams: true para recibir :groupId del router padre.
 */
export const membersRouter: Router = Router({ mergeParams: true });

membersRouter.use(authenticate);

membersRouter.get(
  "/",
  validate({ params: groupIdOnlyParamSchema }),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { groupId } = req.params as { groupId: string };
    const members = await membersService.listByGroup(groupId, userId);
    return ApiResponse.success(res, members);
  }),
);
