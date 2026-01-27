import { handler as createProvider } from "../../src/handlers/providers/create-provider";
import { handler as createAvailability } from "../../src/handlers/availability/create-availability";
import { handler as getSlots } from "../../src/handlers/slot/get-slot";
import { handler as createBooking } from "../../src/handlers/booking/create-booking";
import { handler as confirmBooking } from "../../src/handlers/booking/confirm-booking";
import { handler as cancelBooking } from "../../src/handlers/booking/cancel-booking";
import { handler as getBooking } from "../../src/handlers/booking/get-booking";

// Mock all dependencies
jest.mock("../../src/dao/provider-dao");
jest.mock("../../src/dao/booking-dao");
jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/utils/sqs");
jest.mock("crypto", () => ({ randomUUID: () => "test-uuid" }));

describe("Handler Error Cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOOKING_QUEUE_URL = "test-queue";
  });

  describe("Create Provider", () => {
    it("should handle missing body", async () => {
      const response = await createProvider({ body: null } as any);
      expect(response.statusCode).toBe(400);
    });

    it("should handle invalid provider type", async () => {
      const response = await createProvider({
        body: JSON.stringify({
          providerId: "test",
          providerName: "Test",
          providerType: "INVALID"
        })
      } as any);
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Create Availability", () => {
    it("should handle missing providerId", async () => {
      const response = await createAvailability({
        pathParameters: null,
        body: JSON.stringify({})
      } as any);
      expect(response.statusCode).toBe(400);
    });

    it("should handle missing body", async () => {
      const response = await createAvailability({
        pathParameters: { providerId: "test" },
        body: null
      } as any);
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Get Slots", () => {
    it("should handle missing providerId", async () => {
      const response = await getSlots({
        pathParameters: null,
        queryStringParameters: { date: "2024-01-01" }
      } as any);
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Create Booking", () => {
    it("should handle invalid slotId format", async () => {
      const response = await createBooking({
        body: JSON.stringify({
          providerId: "test",
          slotId: "invalid-format",
          userId: "user1"
        })
      } as any);
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Confirm Booking", () => {
    it("should handle missing bookingId", async () => {
      const response = await confirmBooking({
        pathParameters: null
      } as any);
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Cancel Booking", () => {
    it("should handle missing bookingId", async () => {
      const response = await cancelBooking({
        pathParameters: null
      } as any);
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Get Booking", () => {
    it("should handle missing bookingId", async () => {
      const response = await getBooking({
        pathParameters: null
      } as any);
      expect(response.statusCode).toBe(400);
    });
  });
});