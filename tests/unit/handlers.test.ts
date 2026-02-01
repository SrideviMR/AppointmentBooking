import { handler as createProvider } from "../../src/handlers/providers/create-provider";
import { handler as createAvailability } from "../../src/handlers/availability/create-availability";
import { handler as getSlots } from "../../src/handlers/slot/get-slot";
import { handler as createBooking } from "../../src/handlers/booking/create-booking";
import { handler as confirmBooking } from "../../src/handlers/booking/confirm-booking";
import { handler as cancelBooking } from "../../src/handlers/booking/cancel-booking";
import { handler as getBooking } from "../../src/handlers/booking/get-booking";
import { bookingService } from "../../src/services/booking-service";

// Mock all dependencies
jest.mock("../../src/dao/provider-dao");
jest.mock("../../src/dao/booking-dao");
jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/utils/sqs");
jest.mock("../../src/services/booking-service");
jest.mock("crypto", () => ({ randomUUID: () => "test-uuid" }));

const mockBookingService = bookingService as jest.Mocked<typeof bookingService>;

describe("Handler Layer Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOOKING_QUEUE_URL = "test-queue";
  });

  describe("Create Provider", () => {
    it("should handle missing body", async () => {
      const response = await createProvider({ body: null } as any);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Request body is required");
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

  describe("Create Booking Handler", () => {
    it("should handle missing body", async () => {
      const response = await createBooking({ body: null } as any);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Request body is required");
    });

    it("should handle invalid input via service layer", async () => {
      const response = await createBooking({
        body: JSON.stringify({
          providerId: "test",
          slotId: "invalid-format", // Missing # separator
          userId: "user1"
        })
      } as any);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Invalid slotId format. Expected: date#time");
    });

    it("should delegate to service layer for business logic", async () => {
      const mockResult = {
        bookingId: "booking-123",
        status: "PENDING" as const,
        expiresAt: "2024-01-15T10:05:00Z"
      };
      mockBookingService.createBooking.mockResolvedValue(mockResult);

      const response = await createBooking({
        body: JSON.stringify({
          providerId: "provider-123",
          slotId: "2024-01-15#10:00",
          userId: "user-456"
        })
      } as any);

      expect(response.statusCode).toBe(202);
      expect(mockBookingService.createBooking).toHaveBeenCalledWith({
        providerId: "provider-123",
        slotId: "2024-01-15#10:00",
        userId: "user-456"
      });
      const body = JSON.parse(response.body);
      expect(body).toEqual(mockResult);
    });
  });

  describe("Confirm Booking Handler", () => {
    it("should handle missing bookingId", async () => {
      const response = await confirmBooking({
        pathParameters: null
      } as any);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Booking ID is required");
    });

    it("should handle invalid bookingId format", async () => {
      const response = await confirmBooking({
        pathParameters: { bookingId: "invalid-uuid" }
      } as any);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Invalid booking ID format");
    });

    it("should delegate to service layer", async () => {
      const mockResult = {
        bookingId: "booking-123",
        state: "CONFIRMED" as const,
        confirmedAt: "2024-01-15T10:00:00Z",
        message: "Booking confirmed successfully"
      };
      mockBookingService.confirmBooking.mockResolvedValue(mockResult);

      const response = await confirmBooking({
        pathParameters: { bookingId: "f47ac10b-58cc-4372-a567-0e02b2c3d479" }
      } as any);

      expect(response.statusCode).toBe(200);
      expect(mockBookingService.confirmBooking).toHaveBeenCalledWith({
        bookingId: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
      });
    });
  });

  describe("Cancel Booking Handler", () => {
    it("should handle missing bookingId", async () => {
      const response = await cancelBooking({
        pathParameters: null
      } as any);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Booking ID is required");
    });

    it("should handle invalid bookingId format", async () => {
      const response = await cancelBooking({
        pathParameters: { bookingId: "not-a-uuid" }
      } as any);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Invalid booking ID format");
    });

    it("should delegate to service layer for atomic cancellation", async () => {
      const mockResult = {
        bookingId: "booking-123",
        state: "CANCELLED" as const,
        cancelledAt: "2024-01-15T10:00:00Z",
        message: "Booking cancelled and slot released"
      };
      mockBookingService.cancelBooking.mockResolvedValue(mockResult);

      const response = await cancelBooking({
        pathParameters: { bookingId: "f47ac10b-58cc-4372-a567-0e02b2c3d479" }
      } as any);

      expect(response.statusCode).toBe(200);
      expect(mockBookingService.cancelBooking).toHaveBeenCalledWith({
        bookingId: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
      });
      const body = JSON.parse(response.body);
      expect(body).toEqual(mockResult);
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