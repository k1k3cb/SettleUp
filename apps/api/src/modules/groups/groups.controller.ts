import type { Request, Response } from "express";
import { GroupsService } from "./groups.service.js";
import { GroupsRepository } from "./groups.repository.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { UnauthorizedError } from "../../utils/errors.js";
import type {
  CreateGroupInput,
  UpdateGroupInput,
  JoinGroupInput,
} from "./groups.schemas.js";

const groupsService = new GroupsService(new GroupsRepository());

const requireUserId = (req: Request): string => {
  const userId = req.session?.user.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
};

export const groupsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const groups = await groupsService.listForUser(userId);
    return ApiResponse.success(res, groups);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const group = await groupsService.getById(req.params.id as string, userId);
    return ApiResponse.success(res, group);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const input = req.body as CreateGroupInput;
    const group = await groupsService.create(userId, input);
    return ApiResponse.created(res, group);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const input = req.body as UpdateGroupInput;
    const group = await groupsService.update(req.params.id as string, userId, input);
    return ApiResponse.success(res, group);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    await groupsService.delete(req.params.id as string, userId);
    return ApiResponse.noContent(res);
  }),

  join: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { inviteCode } = req.body as JoinGroupInput;
    const group = await groupsService.joinByCode(userId, inviteCode);
    return ApiResponse.created(res, group);
  }),
};
