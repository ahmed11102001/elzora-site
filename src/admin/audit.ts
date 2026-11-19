// Audit trail for sensitive dashboard actions. Each event is logged as one JSON line and, when the database
// is configured, also stored in `audit_logs` (7.4C). A failing audit insert is logged but never breaks the
// action. Never put secrets, passwords or e-mail bodies in an event.
import { adminDatabaseConfigured, adminSql } from "./db/sql";

export type AuditEvent = {
  action:
    | "auth.login.success"
    | "auth.login.failure"
    | "auth.login.blocked"
    | "auth.mfa.enrolled"
    | "auth.mfa.verified"
    | "auth.mfa.failure"
    | "auth.logout"
    | "auth.forbidden"
    | "trip.create"
    | "trip.update"
    | "trip.status"
    | "trip.archive"
    | "trip.restore"
    | "trip.duplicate"
    | "trip.delete";
  userId?: string;
  detail?: Record<string, string | number | boolean>;
};

export function recordAudit(event: AuditEvent): void {
  console.info(JSON.stringify({ audit: true, at: new Date().toISOString(), ...event }));
  if (!adminDatabaseConfigured()) return;
  const sql = adminSql();
  void sql`INSERT INTO audit_logs (action, user_id, detail)
           VALUES (${event.action}, ${event.userId ?? null}, ${sql.json((event.detail ?? {}) as never)})`.catch(
    (error: unknown) =>
      console.error("audit_logs insert failed", error instanceof Error ? error.message : error),
  );
}
