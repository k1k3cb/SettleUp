import { Router } from "express";
import { BalancesService } from "./balances.service.js";
import { BalancesRepository } from "./balances.repository.js";
import { MembersRepository } from "../members/members.repository.js";
import { GroupsRepository } from "../groups/groups.repository.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { groupIdOnlyParamSchema } from "../groups/groups.schemas.js";

const balancesService = new BalancesService(
  new BalancesRepository(),
  new MembersRepository(),
  new GroupsRepository()
);

const requireUserId = (req: { session?: { user: { id: string } } }): string => {
  const userId = req.session?.user.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
};

export const balancesRouter: Router = Router({ mergeParams: true });

balancesRouter.use(authenticate);

balancesRouter.get(
  "/",
  validate({ params: groupIdOnlyParamSchema }),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { groupId } = req.params as { groupId: string };
    const balances = await balancesService.getGroupBalances(groupId, userId);
    return ApiResponse.success(res, balances);
  })
);
