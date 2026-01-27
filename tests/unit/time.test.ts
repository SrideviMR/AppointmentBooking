import { generateTimeSlots, generateExpirationTime, isExpired, formatDate, getCurrentTimestamp } from "../../src/utils/time";

describe("Time Utils", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should generate time slots", () => {
    const slots = generateTimeSlots("09:00", "11:00", 30);
    expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });

  it("should generate expiration time", () => {
    const expiration = generateExpirationTime(5);
    expect(expiration).toBe("2024-01-01T10:05:00.000Z");
  });

  it("should check if expired", () => {
    expect(isExpired("2024-01-01T09:00:00.000Z")).toBe(true);
    expect(isExpired("2024-01-01T11:00:00.000Z")).toBe(false);
  });

  it("should format date", () => {
    const date = new Date('2024-01-01T10:00:00.000Z');
    expect(formatDate(date)).toBe("2024-01-01");
  });

  it("should get current timestamp", () => {
    expect(getCurrentTimestamp()).toBe("2024-01-01T10:00:00.000Z");
  });
});