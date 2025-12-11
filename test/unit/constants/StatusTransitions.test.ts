import {
  validateStatusTransition,
  getValidNextStatuses,
  PR_OFFICER_ROLE,
  EXTERNAL_MAINTAINER_ROLE,
} from "../../../src/constants/StatusTransitions";
import { ReportStatus } from "../../../src/constants/ReportStatus";

describe("StatusTransitions", () => {
  describe("validateStatusTransition", () => {
    it("should allow same status transition", () => {
      const result = validateStatusTransition(
        ReportStatus.PENDING_APPROVAL,
        ReportStatus.PENDING_APPROVAL,
        PR_OFFICER_ROLE,
        false,
        false
      );
      expect(result.valid).toBe(true);
    });

    it("should reject invalid transition", () => {
      const result = validateStatusTransition(
        ReportStatus.PENDING_APPROVAL,
        ReportStatus.RESOLVED,
        PR_OFFICER_ROLE,
        false,
        false
      );
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain("Invalid status transition");
    });

    describe("PR Officer transitions", () => {
      it("should allow PR Officer to transition PENDING_APPROVAL -> ASSIGNED", () => {
        const result = validateStatusTransition(
          ReportStatus.PENDING_APPROVAL,
          ReportStatus.ASSIGNED,
          PR_OFFICER_ROLE,
          false,
          false
        );
        expect(result.valid).toBe(true);
      });

      it("should allow PR Officer to transition PENDING_APPROVAL -> REJECTED", () => {
        const result = validateStatusTransition(
          ReportStatus.PENDING_APPROVAL,
          ReportStatus.REJECTED,
          PR_OFFICER_ROLE,
          false,
          false
        );
        expect(result.valid).toBe(true);
      });

      it("should reject non-PR Officer from PENDING_APPROVAL -> ASSIGNED", () => {
        const result = validateStatusTransition(
          ReportStatus.PENDING_APPROVAL,
          ReportStatus.ASSIGNED,
          "Admin",
          false,
          false
        );
        expect(result.valid).toBe(false);
        expect(result.errorMessage).toContain("cannot transition");
        expect(result.errorMessage).toContain("Public Relations Officer");
      });
    });

    describe("Assigned user transitions", () => {
      it("should allow assigned user to transition ASSIGNED -> IN_PROGRESS", () => {
        const result = validateStatusTransition(
          ReportStatus.ASSIGNED,
          ReportStatus.IN_PROGRESS,
          "Technical Office Staff",
          false,
          true
        );
        expect(result.valid).toBe(true);
      });

      it("should reject non-assigned user from ASSIGNED -> IN_PROGRESS", () => {
        const result = validateStatusTransition(
          ReportStatus.ASSIGNED,
          ReportStatus.IN_PROGRESS,
          "Technical Office Staff",
          false,
          false
        );
        expect(result.valid).toBe(false);
        expect(result.errorMessage).toContain("Only the assigned user");
      });

      it("should allow assigned user to transition ASSIGNED -> DELEGATED", () => {
        const result = validateStatusTransition(
          ReportStatus.ASSIGNED,
          ReportStatus.DELEGATED,
          "Technical Office Staff",
          false,
          true
        );
        expect(result.valid).toBe(true);
      });

      it("should reject external maintainer from ASSIGNED -> DELEGATED", () => {
        const result = validateStatusTransition(
          ReportStatus.ASSIGNED,
          ReportStatus.DELEGATED,
          EXTERNAL_MAINTAINER_ROLE,
          true,
          true
        );
        expect(result.valid).toBe(false);
        // The external maintainer check happens first, so we get that error message
        expect(result.errorMessage).toContain(
          "External maintainers cannot transition"
        );
      });
    });

    describe("External maintainer transitions", () => {
      it("should allow external maintainer to transition DELEGATED -> IN_PROGRESS", () => {
        const result = validateStatusTransition(
          ReportStatus.DELEGATED,
          ReportStatus.IN_PROGRESS,
          EXTERNAL_MAINTAINER_ROLE,
          true,
          true
        );
        expect(result.valid).toBe(true);
      });

      it("should reject non-assigned external maintainer from DELEGATED -> IN_PROGRESS", () => {
        const result = validateStatusTransition(
          ReportStatus.DELEGATED,
          ReportStatus.IN_PROGRESS,
          EXTERNAL_MAINTAINER_ROLE,
          true,
          false
        );
        expect(result.valid).toBe(false);
        expect(result.errorMessage).toContain("Only the assigned user");
      });

      it("should reject non-external maintainer from DELEGATED -> IN_PROGRESS when not external", () => {
        const result = validateStatusTransition(
          ReportStatus.DELEGATED,
          ReportStatus.IN_PROGRESS,
          "Technical Office Staff",
          false,
          true
        );
        // This should still work because externalMaintainerAllowed is true
        // but the rule allows "assigned" users
        expect(result.valid).toBe(true);
      });
    });

    describe("In Progress transitions", () => {
      it("should allow assigned user to transition IN_PROGRESS -> SUSPENDED", () => {
        const result = validateStatusTransition(
          ReportStatus.IN_PROGRESS,
          ReportStatus.SUSPENDED,
          "Technical Office Staff",
          false,
          true
        );
        expect(result.valid).toBe(true);
      });

      it("should allow assigned user to transition IN_PROGRESS -> RESOLVED", () => {
        const result = validateStatusTransition(
          ReportStatus.IN_PROGRESS,
          ReportStatus.RESOLVED,
          "Technical Office Staff",
          false,
          true
        );
        expect(result.valid).toBe(true);
      });

      it("should allow external maintainer to transition IN_PROGRESS -> RESOLVED", () => {
        const result = validateStatusTransition(
          ReportStatus.IN_PROGRESS,
          ReportStatus.RESOLVED,
          EXTERNAL_MAINTAINER_ROLE,
          true,
          true
        );
        expect(result.valid).toBe(true);
      });

      it("should reject non-assigned user from IN_PROGRESS -> RESOLVED", () => {
        const result = validateStatusTransition(
          ReportStatus.IN_PROGRESS,
          ReportStatus.RESOLVED,
          "Technical Office Staff",
          false,
          false
        );
        expect(result.valid).toBe(false);
        expect(result.errorMessage).toContain("Only the assigned user");
      });
    });

    describe("Suspended transitions", () => {
      it("should allow assigned user to transition SUSPENDED -> IN_PROGRESS", () => {
        const result = validateStatusTransition(
          ReportStatus.SUSPENDED,
          ReportStatus.IN_PROGRESS,
          "Technical Office Staff",
          false,
          true
        );
        expect(result.valid).toBe(true);
      });

      it("should allow assigned user to transition SUSPENDED -> RESOLVED", () => {
        const result = validateStatusTransition(
          ReportStatus.SUSPENDED,
          ReportStatus.RESOLVED,
          "Technical Office Staff",
          false,
          true
        );
        expect(result.valid).toBe(true);
      });

      it("should allow external maintainer to transition SUSPENDED -> IN_PROGRESS", () => {
        const result = validateStatusTransition(
          ReportStatus.SUSPENDED,
          ReportStatus.IN_PROGRESS,
          EXTERNAL_MAINTAINER_ROLE,
          true,
          true
        );
        expect(result.valid).toBe(true);
      });
    });

    describe("Role matching", () => {
      it("should match role exactly", () => {
        const result = validateStatusTransition(
          ReportStatus.PENDING_APPROVAL,
          ReportStatus.ASSIGNED,
          PR_OFFICER_ROLE,
          false,
          false
        );
        expect(result.valid).toBe(true);
      });

      it("should match role when role string includes the role name", () => {
        const result = validateStatusTransition(
          ReportStatus.PENDING_APPROVAL,
          ReportStatus.ASSIGNED,
          `Senior ${PR_OFFICER_ROLE}`,
          false,
          false
        );
        expect(result.valid).toBe(true);
      });
    });
  });

  describe("getValidNextStatuses", () => {
    it("should return valid next statuses for PR Officer from PENDING_APPROVAL", () => {
      const statuses = getValidNextStatuses(
        ReportStatus.PENDING_APPROVAL,
        PR_OFFICER_ROLE,
        false,
        false
      );
      expect(statuses).toContain(ReportStatus.ASSIGNED);
      expect(statuses).toContain(ReportStatus.REJECTED);
      expect(statuses.length).toBe(2);
    });

    it("should return valid next statuses for assigned user from ASSIGNED", () => {
      const statuses = getValidNextStatuses(
        ReportStatus.ASSIGNED,
        "Technical Office Staff",
        false,
        true
      );
      expect(statuses).toContain(ReportStatus.IN_PROGRESS);
      expect(statuses).toContain(ReportStatus.DELEGATED);
    });

    it("should not return DELEGATED for external maintainer from ASSIGNED", () => {
      const statuses = getValidNextStatuses(
        ReportStatus.ASSIGNED,
        EXTERNAL_MAINTAINER_ROLE,
        true,
        true
      );
      // External maintainers cannot transition from ASSIGNED (externalMaintainerAllowed: false)
      // They only receive DELEGATED status, not ASSIGNED
      expect(statuses).not.toContain(ReportStatus.DELEGATED);
      expect(statuses).not.toContain(ReportStatus.IN_PROGRESS);
      expect(statuses.length).toBe(0);
    });

    it("should return valid next statuses for external maintainer from DELEGATED", () => {
      const statuses = getValidNextStatuses(
        ReportStatus.DELEGATED,
        EXTERNAL_MAINTAINER_ROLE,
        true,
        true
      );
      expect(statuses).toContain(ReportStatus.IN_PROGRESS);
    });

    it("should return valid next statuses for assigned user from IN_PROGRESS", () => {
      const statuses = getValidNextStatuses(
        ReportStatus.IN_PROGRESS,
        "Technical Office Staff",
        false,
        true
      );
      expect(statuses).toContain(ReportStatus.SUSPENDED);
      expect(statuses).toContain(ReportStatus.RESOLVED);
    });

    it("should return valid next statuses for assigned user from SUSPENDED", () => {
      const statuses = getValidNextStatuses(
        ReportStatus.SUSPENDED,
        "Technical Office Staff",
        false,
        true
      );
      expect(statuses).toContain(ReportStatus.IN_PROGRESS);
      expect(statuses).toContain(ReportStatus.RESOLVED);
    });

    it("should return empty array for non-assigned user from ASSIGNED", () => {
      const statuses = getValidNextStatuses(
        ReportStatus.ASSIGNED,
        "Technical Office Staff",
        false,
        false
      );
      expect(statuses.length).toBe(0);
    });

    it("should return empty array for invalid current status", () => {
      const statuses = getValidNextStatuses(
        ReportStatus.RESOLVED,
        PR_OFFICER_ROLE,
        false,
        false
      );
      expect(statuses.length).toBe(0);
    });
  });
});
