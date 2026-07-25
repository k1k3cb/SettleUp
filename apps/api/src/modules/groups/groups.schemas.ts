import { z } from "zod";

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or less")
    .trim(),
});

export const updateGroupSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(80, "Name must be 80 characters or less")
      .trim()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const joinGroupSchema = z.object({
  inviteCode: z
    .string()
    .min(6, "Invite code is required")
    .max(32, "Invalid invite code")
    .trim(),
});

export const groupIdParamSchema = z.object({
  id: z.string().uuid("Invalid group id"),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
