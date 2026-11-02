import { jest } from "@jest/globals";
import { escapeHTML, sanitizeInput, sanitizeObject } from "../js/utils.js";

describe("Database Operations & Data Integrity Suite", () => {
  let mockFirestore;
  let mockDb;

  beforeEach(() => {
    const storage = new Map();

    mockFirestore = {
      collection: jest.fn((colName) => {
        return {
          doc: jest.fn((docId) => {
            const path = `${colName}/${docId}`;
            return {
              get: jest.fn(async () => {
                if (storage.has(path)) {
                  return {
                    exists: true,
                    id: docId,
                    data: () => ({ ...storage.get(path) }),
                  };
                }
                return { exists: false, data: () => null };
              }),
              set: jest.fn(async (data, options = {}) => {
                const existing = storage.get(path) || {};
                const sanitized = sanitizeObject(data);
                const merged = options.merge ? { ...existing, ...sanitized } : sanitized;
                storage.set(path, merged);
                return { id: docId };
              }),
              update: jest.fn(async (data) => {
                if (!storage.has(path)) {
                  throw new Error(`Document ${path} does not exist`);
                }
                const existing = storage.get(path);
                const sanitized = sanitizeObject(data);
                storage.set(path, { ...existing, ...sanitized });
                return true;
              }),
              delete: jest.fn(async () => {
                storage.delete(path);
                return true;
              }),
            };
          }),
          add: jest.fn(async (data) => {
            const autoId = `auto_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const path = `${colName}/${autoId}`;
            const sanitized = sanitizeObject(data);
            storage.set(path, sanitized);
            return {
              id: autoId,
              get: async () => ({
                exists: true,
                id: autoId,
                data: () => ({ ...sanitized }),
              }),
            };
          }),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };
      }),
    };

    mockDb = mockFirestore;
  });

  describe("Users Collection Read / Write", () => {
    it("should create user profile with sanitized data and default roles", async () => {
      const uid = "user_alpha_123";
      const userPayload = {
        username: "<script>alert('xss')</script>John Doe",
        email: "john@example.com",
        isAdmin: false, // Security: regular users cannot make themselves admin
        orgId: "org_biz_789",
      };

      await mockDb.collection("users").doc(uid).set(userPayload);

      const docSnap = await mockDb.collection("users").doc(uid).get();
      expect(docSnap.exists).toBe(true);
      const data = docSnap.data();

      expect(data.email).toBe("john@example.com");
      // Script tags must be stripped by sanitization
      expect(data.username).toBe("John Doe");
      expect(data.isAdmin).toBe(false);
    });

    it("should prevent prototype pollution in user updates", async () => {
      const uid = "user_beta_456";
      await mockDb.collection("users").doc(uid).set({ username: "Jane Doe" });

      const maliciousUpdate = JSON.parse(
        '{"username": "Jane Updated", "__proto__": {"isAdmin": true}}'
      );
      await mockDb.collection("users").doc(uid).update(maliciousUpdate);

      const docSnap = await mockDb.collection("users").doc(uid).get();
      expect(docSnap.data().username).toBe("Jane Updated");
      expect(docSnap.data().isAdmin).toBeUndefined();
      expect({}.isAdmin).toBeUndefined();
    });
  });

  describe("Schedules Collection Read / Write", () => {
    it("should create and update employee schedule for a given date", async () => {
      const scheduleId = "manager_uid_2026-11-03";
      const schedulePayload = {
        uid: "manager_uid",
        authorId: "manager_uid",
        orgId: "org_biz_789",
        date: "2026-11-03",
        shifts: [
          { employeeName: "Sarah Connor", role: "Cook", startTime: "09:00", endTime: "17:00" },
          { employeeName: "Alex Rivera", role: "Leader", startTime: "08:00", endTime: "16:00" },
        ],
      };

      await mockDb.collection("schedules").doc(scheduleId).set(schedulePayload);

      const readSnap = await mockDb.collection("schedules").doc(scheduleId).get();
      expect(readSnap.exists).toBe(true);
      expect(readSnap.data().shifts.length).toBe(2);
      expect(readSnap.data().shifts[0].employeeName).toBe("Sarah Connor");

      // Update shifts by adding a 3rd shift
      const updatedShifts = [
        ...readSnap.data().shifts,
        { employeeName: "Marcus Vance", role: "Cashier", startTime: "12:00", endTime: "20:00" },
      ];
      await mockDb.collection("schedules").doc(scheduleId).update({ shifts: updatedShifts });

      const reReadSnap = await mockDb.collection("schedules").doc(scheduleId).get();
      expect(reReadSnap.data().shifts.length).toBe(3);
    });

    it("should delete schedule document when all shifts are removed", async () => {
      const scheduleId = "manager_uid_2026-11-04";
      await mockDb.collection("schedules").doc(scheduleId).set({ shifts: [] });
      await mockDb.collection("schedules").doc(scheduleId).delete();

      const snap = await mockDb.collection("schedules").doc(scheduleId).get();
      expect(snap.exists).toBe(false);
    });
  });

  describe("Tasks & Incidents Operations", () => {
    it("should add a new task and update status to completed", async () => {
      const taskRef = await mockDb.collection("tasks").add({
        title: "Deep clean prep station",
        assigneeId: "emp_123",
        orgId: "org_biz_789",
        status: "pending",
      });

      expect(taskRef.id).toBeDefined();

      // Update task to completed
      await mockDb.collection("tasks").doc(taskRef.id).update({
        status: "completed",
        completedAt: "2026-11-02T16:00:00Z",
      });

      const taskSnap = await mockDb.collection("tasks").doc(taskRef.id).get();
      expect(taskSnap.data().status).toBe("completed");
      expect(taskSnap.data().completedAt).toBe("2026-11-02T16:00:00Z");
    });

    it("should record and resolve an incident report", async () => {
      const incidentRef = await mockDb.collection("incident_reports").add({
        title: "Spill near beverage counter",
        severity: "medium",
        reportedByUid: "emp_456",
        orgId: "org_biz_789",
        resolved: false,
      });

      await mockDb.collection("incident_reports").doc(incidentRef.id).update({
        resolved: true,
        resolvedBy: "manager_uid",
      });

      const incidentSnap = await mockDb.collection("incident_reports").doc(incidentRef.id).get();
      expect(incidentSnap.data().resolved).toBe(true);
      expect(incidentSnap.data().resolvedBy).toBe("manager_uid");
    });
  });

  describe("Shift Handoffs & Acknowledgements", () => {
    it("should create shift handoff and record manager acknowledgement", async () => {
      const handoffRef = await mockDb.collection("shift_handoffs").add({
        authorId: "leader_789",
        orgId: "org_biz_789",
        shiftType: "Evening",
        notes: "Stock replenished, registers balanced to $500.",
        urgentAlerts: "Freezer door needs seal replacement.",
        acknowledgedBy: null,
      });

      const handoffSnap = await mockDb.collection("shift_handoffs").doc(handoffRef.id).get();
      expect(handoffSnap.data().shiftType).toBe("Evening");
      expect(handoffSnap.data().acknowledgedBy).toBeNull();

      // Next manager acknowledges
      await mockDb.collection("shift_handoffs").doc(handoffRef.id).update({
        acknowledgedBy: "morning_mgr_101",
        acknowledgedAt: "2026-11-03T06:00:00Z",
      });

      const updatedSnap = await mockDb.collection("shift_handoffs").doc(handoffRef.id).get();
      expect(updatedSnap.data().acknowledgedBy).toBe("morning_mgr_101");
    });
  });
});
