import { randomBytes } from "node:crypto";
import { GroupsRepository, type Group } from "./groups.repository.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../../utils/errors.js";
import type { CreateGroupInput, UpdateGroupInput } from "./groups.schemas.js";

const INVITE_CODE_BYTES = 6; // → 12 chars hex, suficiente entropy

const generateInviteCode = (): string =>
  randomBytes(INVITE_CODE_BYTES).toString("hex");

export class GroupsService {
  constructor(private readonly repo: GroupsRepository) {}

  async listForUser(userId: string): Promise<Group[]> {
    return this.repo.listForUser(userId);
  }

  async getById(id: string, userId: string): Promise<Group> {
    const group = await this.repo.findById(id);
    if (!group) throw new NotFoundError("Group not found");
    const member = await this.repo.isMember(id, userId);
    if (!member) throw new ForbiddenError("You are not a member of this group");
    return group;
  }

  async create(userId: string, input: CreateGroupInput): Promise<Group> {
    const group = await this.repo.create({
      name: input.name,
      createdBy: userId,
      inviteCode: generateInviteCode(),
    });
    // El creador se une automáticamente a su grupo.
    await this.repo.addMember(group.id, userId);
    return group;
  }

  async update(
    id: string,
    userId: string,
    input: UpdateGroupInput,
  ): Promise<Group> {
    const group = await this.repo.findById(id);
    if (!group) throw new NotFoundError("Group not found");
    if (group.createdBy !== userId) {
      throw new ForbiddenError("Only the group creator can edit it");
    }
    const updated = await this.repo.update(id, input);
    if (!updated) throw new NotFoundError("Group not found");
    return updated;
  }

  async delete(id: string, userId: string): Promise<void> {
    const group = await this.repo.findById(id);
    if (!group) throw new NotFoundError("Group not found");
    if (group.createdBy !== userId) {
      throw new ForbiddenError("Only the group creator can delete it");
    }
    await this.repo.delete(id);
  }

  async joinByCode(userId: string, inviteCode: string): Promise<Group> {
    const group = await this.repo.findByInviteCode(inviteCode);
    if (!group) throw new NotFoundError("Invalid invite code");
    const alreadyMember = await this.repo.isMember(group.id, userId);
    if (alreadyMember) {
      throw new ConflictError("You are already a member of this group");
    }
    await this.repo.addMember(group.id, userId);
    return group;
  }
}
