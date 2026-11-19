// Audit trail for sensitive dashboard actions. Until the `audit_logs` table exists (7.4C) events are
// written to the server log as one JSON line. Never put secrets, passwords or e-mail bodies in an event.

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
}
