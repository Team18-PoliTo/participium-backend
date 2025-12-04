export const ReportStatus = {
  PENDING_APPROVAL: "Pending Approval",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
  RESOLVED: "Resolved",
  DELEGATED: "Delegated",
} as const;

export type ReportStatusType = typeof ReportStatus[keyof typeof ReportStatus];

export const ReportStatusValues = Object.values(ReportStatus);

