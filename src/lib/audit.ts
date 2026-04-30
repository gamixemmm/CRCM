import { prisma } from "@/lib/prisma";

export type AuditActor = {
  id?: string;
  companyId?: string;
  name?: string;
  email?: string;
  role?: string;
};

type AuditInput = {
  actor?: AuditActor | null;
  companyId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
};

export async function logAuditAction(input: AuditInput) {
  const companyId = input.companyId ?? input.actor?.companyId;
  if (!companyId) return;

  try {
    await prisma.auditLog.create({
      data: {
        companyId,
        actorId: input.actor?.id || null,
        actorName: input.actor?.name || null,
        actorEmail: input.actor?.email || null,
        actorRole: input.actor?.role || null,
        action: input.action,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        message: input.message,
        metadata: input.metadata ? (JSON.parse(JSON.stringify(input.metadata)) as any) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
