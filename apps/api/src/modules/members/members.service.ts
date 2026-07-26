import { MembersRepository, type GroupMember } from "./members.repository.js";
import { GroupsRepository } from "../groups/groups.repository.js";
import { NotFoundError, ForbiddenError } from "../../utils/errors.js";

export class MembersService {
  constructor(
    private readonly repo: MembersRepository,
    private readonly groupsRepo: GroupsRepository,
  ) {}

  async listByGroup(groupId: string, userId: string): Promise<GroupMember[]> {
    // El grupo debe existir y el usuario ser miembro para ver la lista.
    // Mismo patrón que en groups.service: la membership es lo que da
    // acceso, no la existencia del grupo.
    const group = await this.groupsRepo.findById(groupId);
    if (!group) throw new NotFoundError("Group not found");
    const isMember = await this.groupsRepo.isMember(groupId, userId);
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this group");
    }
    return this.repo.listByGroup(groupId);
  }
}
