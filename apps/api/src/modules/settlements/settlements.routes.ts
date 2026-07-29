import { Router } from "express";
import { SettlementsService } from "./settlements.service.js";
import { SettlementsRepository } from "./settlements.repository.js";
import { GroupsRepository } from "../groups/groups.repository.js";
import { MembersRepository } from "../members/members.repository.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  groupIdOnlyParamSchema,
  settlementIdParamSchema,
  createSettlementSchema,
} from "./settlements.schemas.js";

const settlementsService = new SettlementsService(
  new SettlementsRepository(),
  new GroupsRepository(),
  new MembersRepository(),
);

const requireUserId = (req: { session?: { user: { id: string } } }): string => {
  const userId = req.session?.user.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
};

export const settlementsRouter: Router = Router({ mergeParams: true });

settlementsRouter.use(authenticate);

settlementsRouter.get(
  "/",
  validate({ params: groupIdOnlyParamSchema }),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { groupId } = req.params as { groupId: string };
    const list = await settlementsService.listByGroup(groupId, userId);
    return ApiResponse.success(res, list);
  }),
);

settlementsRouter.post(
  "/",
  validate({ params: groupIdOnlyParamSchema, body: createSettlementSchema }),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { groupId } = req.params as { groupId: string };
    const input = req.body as Parameters<typeof settlementsService.create>[2];
    const settlement = await settlementsService.create(groupId, userId, input);
    return ApiResponse.created(res, settlement);
  }),
);

settlementsRouter.delete(
  "/:settlementId",
  validate({ params: settlementIdParamSchema }),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { groupId, settlementId } = req.params as {
      groupId: string;
      settlementId: string;
    };
    await settlementsService.cancel(groupId, settlementId, userId);
    return ApiResponse.noContent(res);
  }),
);
