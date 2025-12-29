import { ReportStatus, ReportStatusType } from "./ReportStatus";

/**
 * Status Transition Rules
 *
 * Defines valid status transitions based on:
 * - Current status
 * - Target status
 * - User role
 * - Whether user is an external maintainer
 *
 * | From              | To           | Who                                    |
 * |-------------------|--------------|----------------------------------------|
 * | PENDING_APPROVAL  | ASSIGNED     | PR Officer                             |
 * | PENDING_APPROVAL  | REJECTED     | PR Officer                             |
 * | ASSIGNED          | IN_PROGRESS  | Assigned Staff                         |
 * | ASSIGNED          | DELEGATED    | Assigned Staff (municipality only)     |
 * | DELEGATED         | IN_PROGRESS  | External Maintainer (assigned)         |
 * | IN_PROGRESS       | SUSPENDED    | Assigned User                          |
 * | IN_PROGRESS       | RESOLVED     | Assigned User                          |
 * | SUSPENDED         | IN_PROGRESS  | Assigned User                          |
 * | SUSPENDED         | RESOLVED     | Assigned User                          |
 */

// Role identifiers
export const PR_OFFICER_ROLE = "Public Relations Officer";
export const EXTERNAL_MAINTAINER_ROLE = "External Maintainer";
export const EXTERNAL_MAINTAINER_ROLE_ID = 28;
export const ADMIN_ROLE = "ADMIN";
export const ADMIN_ROLE_ID = 1;
export const UNASSIGNED_ROLE_ID = 0;
export const SINGLETON_ROLE_IDS = [
  ADMIN_ROLE_ID,
  EXTERNAL_MAINTAINER_ROLE_ID,
  UNASSIGNED_ROLE_ID,
] as const;

export const isSingletonRoleId = (roleId: number): roleId is typeof SINGLETON_ROLE_IDS[number] => {
  return (SINGLETON_ROLE_IDS as readonly number[]).includes(roleId);
};

// Transition rules structure
interface TransitionRule {
  from: ReportStatusType;
  to: ReportStatusType;
  allowedRoles: string[] | "assigned"; // "assigned" means any user currently assigned to the report
  externalMaintainerAllowed: boolean;
  municipalityOnly?: boolean; // For delegation - only municipality staff can delegate
}

/**
 * All valid status transitions with their permission rules
 */
export const STATUS_TRANSITIONS: TransitionRule[] = [
  // PR Officer transitions (from Pending Approval)
  {
    from: ReportStatus.PENDING_APPROVAL,
    to: ReportStatus.ASSIGNED,
    allowedRoles: [PR_OFFICER_ROLE],
    externalMaintainerAllowed: false,
  },
  {
    from: ReportStatus.PENDING_APPROVAL,
    to: ReportStatus.REJECTED,
    allowedRoles: [PR_OFFICER_ROLE],
    externalMaintainerAllowed: false,
  },

  // Assigned Staff transitions (from Assigned)
  {
    from: ReportStatus.ASSIGNED,
    to: ReportStatus.IN_PROGRESS,
    allowedRoles: "assigned",
    externalMaintainerAllowed: false, // External maintainers receive DELEGATED, not ASSIGNED
  },
  {
    from: ReportStatus.ASSIGNED,
    to: ReportStatus.DELEGATED,
    allowedRoles: "assigned",
    externalMaintainerAllowed: false, // Only municipality staff can delegate
    municipalityOnly: true,
  },

  // External Maintainer transitions (from Delegated)
  {
    from: ReportStatus.DELEGATED,
    to: ReportStatus.IN_PROGRESS,
    allowedRoles: "assigned",
    externalMaintainerAllowed: true,
  },

  // In Progress transitions (assigned user - both staff and external maintainers)
  {
    from: ReportStatus.IN_PROGRESS,
    to: ReportStatus.SUSPENDED,
    allowedRoles: "assigned",
    externalMaintainerAllowed: true,
  },
  {
    from: ReportStatus.IN_PROGRESS,
    to: ReportStatus.RESOLVED,
    allowedRoles: "assigned",
    externalMaintainerAllowed: true,
  },

  // Suspended transitions (assigned user - both staff and external maintainers)
  {
    from: ReportStatus.SUSPENDED,
    to: ReportStatus.IN_PROGRESS,
    allowedRoles: "assigned",
    externalMaintainerAllowed: true,
  },
  {
    from: ReportStatus.SUSPENDED,
    to: ReportStatus.RESOLVED,
    allowedRoles: "assigned",
    externalMaintainerAllowed: true,
  },
];

export interface TransitionValidationResult {
  valid: boolean;
  errorMessage?: string;
}

/**
 * Validates if a status transition is allowed based on role and current status
 *
 * @param currentStatus - The current status of the report
 * @param newStatus - The target status to transition to
 * @param userRole - The role of the user attempting the transition
 * @param isExternalMaintainer - Whether the user is an external maintainer
 * @param isAssignedUser - Whether the user is currently assigned to the report
 * @returns TransitionValidationResult with valid flag and error message if invalid
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  userRole: string,
  isExternalMaintainer: boolean,
  isAssignedUser: boolean = false
): TransitionValidationResult {
  // If status isn't changing, allow it
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  // Find matching transition rule
  const rule = STATUS_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === newStatus
  );

  if (!rule) {
    return {
      valid: false,
      errorMessage: `Invalid status transition from "${currentStatus}" to "${newStatus}". This transition is not allowed.`,
    };
  }

  // Check external maintainer permission
  if (isExternalMaintainer && !rule.externalMaintainerAllowed) {
    return {
      valid: false,
      errorMessage: `External maintainers cannot transition reports from "${currentStatus}" to "${newStatus}".`,
    };
  }

  // Check municipality-only restriction (for delegation)
  if (rule.municipalityOnly && isExternalMaintainer) {
    return {
      valid: false,
      errorMessage: `Only municipality staff can delegate reports. External maintainers cannot perform this transition.`,
    };
  }

  // Check role-based permission
  if (rule.allowedRoles === "assigned") {
    // This transition requires the user to be assigned to the report
    if (!isAssignedUser) {
      return {
        valid: false,
        errorMessage: `Only the assigned user can transition this report from "${currentStatus}" to "${newStatus}".`,
      };
    }
  } else {
    // Check if user's role is in the allowed roles
    const hasRole = rule.allowedRoles.some(
      (allowedRole) =>
        userRole === allowedRole || userRole?.includes(allowedRole)
    );
    if (!hasRole) {
      return {
        valid: false,
        errorMessage: `Users with role "${userRole}" cannot transition reports from "${currentStatus}" to "${newStatus}". Allowed roles: ${rule.allowedRoles.join(", ")}.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Get all valid target statuses for a given current status and user context
 * Useful for frontend to show available options
 */
export function getValidNextStatuses(
  currentStatus: string,
  userRole: string,
  isExternalMaintainer: boolean,
  isAssignedUser: boolean
): ReportStatusType[] {
  return STATUS_TRANSITIONS.filter((rule) => {
    if (rule.from !== currentStatus) return false;
    if (isExternalMaintainer && !rule.externalMaintainerAllowed) return false;
    if (rule.municipalityOnly && isExternalMaintainer) return false;

    if (rule.allowedRoles === "assigned") {
      return isAssignedUser;
    } else {
      return rule.allowedRoles.some(
        (allowedRole) =>
          userRole === allowedRole || userRole?.includes(allowedRole)
      );
    }
  }).map((rule) => rule.to);
}
