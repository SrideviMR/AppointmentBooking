"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const time_1 = require("../../src/utils/time");
describe("Time Utils", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    it("should generate time slots", () => {
        const slots = (0, time_1.generateTimeSlots)("09:00", "11:00", 30);
        expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30"]);
    });
    it("should generate expiration time", () => {
        const expiration = (0, time_1.generateExpirationTime)(5);
        expect(expiration).toBe("2024-01-01T10:05:00.000Z");
    });
    it("should check if expired", () => {
        expect((0, time_1.isExpired)("2024-01-01T09:00:00.000Z")).toBe(true);
        expect((0, time_1.isExpired)("2024-01-01T11:00:00.000Z")).toBe(false);
    });
    it("should format date", () => {
        const date = new Date('2024-01-01T10:00:00.000Z');
        expect((0, time_1.formatDate)(date)).toBe("2024-01-01");
    });
    it("should get current timestamp", () => {
        expect((0, time_1.getCurrentTimestamp)()).toBe("2024-01-01T10:00:00.000Z");
    });
});
//# sourceMappingURL=time.test.js.map