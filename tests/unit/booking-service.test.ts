import { bookingService } from '../../src/services/booking-service';
import { BookingNotFoundError, SlotUnavailableError } from "../../src/types/booking";
import { bookingDao } from '../../src/dao/booking-dao';
import { slotDao } from '../../src/dao/slot-dao';
import { sendMessage } from '../../src/utils/sqs';
import { queryItems } from '../../src/utils/dynamodb';
import { BookingState, SlotStatus, DynamoDBErrorName } from '../../src/types/enums';

// Mock dependencies
jest.mock('../../src/dao/booking-dao');
jest.mock('../../src/dao/slot-dao');
jest.mock('../../src/utils/sqs');
jest.mock('../../src/utils/dynamodb');
jest.mock('crypto', () => ({
  randomUUID: () => 'test-uuid-123'
}));

const mockBookingDao = bookingDao as jest.Mocked<typeof bookingDao>;
const mockSlotDao = slotDao as jest.Mocked<typeof slotDao>;
const mockSendMessage = sendMessage as jest.MockedFunction<typeof sendMessage>;
const mockQueryItems = queryItems as jest.MockedFunction<typeof queryItems>;

describe('BookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOOKING_QUEUE_URL = 'test-queue-url';
  });

  describe('createBooking', () => {
    const validRequest = {
      providerId: 'provider-123',
      slotId: '2024-01-15#10:00',
      userId: 'user-456'
    };

    it('should create booking successfully', async () => {
      mockQueryItems.mockResolvedValue([
        { status: SlotStatus.AVAILABLE, PK: 'PROVIDER#provider-123', SK: 'SLOT#2024-01-15#10:00' }
      ]);
      mockSlotDao.holdSlot.mockResolvedValue(true);
      mockSendMessage.mockResolvedValue({} as any);

      const result = await bookingService.createBooking(validRequest);

      expect(result).toEqual({
        bookingId: 'booking-test-uuid-123',
        status: BookingState.PENDING,
        expiresAt: expect.any(String)
      });
      expect(mockSlotDao.holdSlot).toHaveBeenCalledWith(
        'provider-123',
        '2024-01-15#10:00',
        'booking-test-uuid-123',
        expect.any(String)
      );
      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should throw SlotUnavailableError if slot does not exist', async () => {
      mockQueryItems.mockResolvedValue([]);

      await expect(bookingService.createBooking(validRequest))
        .rejects.toThrowError(new SlotUnavailableError("Slot does not exist. Please create availability first."));
    });

    it('should throw SlotUnavailableError if slot is held', async () => {
      mockQueryItems.mockResolvedValue([
        { status: SlotStatus.HELD, holdExpiresAt: new Date(Date.now() + 300000).toISOString() }
      ]);

      await expect(bookingService.createBooking(validRequest))
        .rejects.toThrow(SlotUnavailableError);
    });

    it('should throw SlotUnavailableError if slot is reserved', async () => {
      mockQueryItems.mockResolvedValue([
        { status: SlotStatus.RESERVED }
      ]);

      await expect(bookingService.createBooking(validRequest))
        .rejects.toThrow(SlotUnavailableError);
    });

    it('should throw SlotUnavailableError when hold fails', async () => {
      mockQueryItems.mockResolvedValue([{ status: SlotStatus.AVAILABLE }]);
      mockSlotDao.holdSlot.mockResolvedValue(false);

      await expect(bookingService.createBooking(validRequest))
        .rejects.toThrow(SlotUnavailableError);
    });

    it('should throw Error on DynamoDB throttling', async () => {
      mockQueryItems.mockResolvedValue([{ status: SlotStatus.AVAILABLE }]);
      const throttleError = new Error('Throttling');
      throttleError.name = DynamoDBErrorName.PROVISIONED_THROUGHPUT_EXCEEDED;
      mockSlotDao.holdSlot.mockRejectedValue(throttleError);

      await expect(bookingService.createBooking(validRequest))
        .rejects.toThrow(Error);
    });
  });

  describe('confirmBooking', () => {
    const validRequest = { bookingId: 'booking-123' };
    const mockBooking = {
      bookingId: 'booking-123',
      providerId: 'provider-123',
      slotId: '2024-01-15#10:00',
      state: BookingState.PENDING
    };

    it('should confirm booking successfully', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(mockBooking as any);
      mockSlotDao.confirmBookingAndReserveSlot.mockResolvedValue(undefined);

      const result = await bookingService.confirmBooking(validRequest);

      expect(result).toEqual({
        bookingId: 'booking-123',
        state: BookingState.CONFIRMED,
        confirmedAt: expect.any(String),
        message: 'Booking confirmed successfully'
      });
      expect(mockSlotDao.confirmBookingAndReserveSlot).toHaveBeenCalledWith(
        'booking-123',
        'provider-123',
        '2024-01-15#10:00'
      );
    });

    it('should throw BookingNotFoundError if booking does not exist', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(undefined);

      await expect(bookingService.confirmBooking(validRequest))
        .rejects.toThrow(BookingNotFoundError);
    });

    it('should throw Error on transaction cancellation', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(mockBooking as any);
      const transactionError = new Error('Transaction cancelled');
      transactionError.name = DynamoDBErrorName.TRANSACTION_CANCELLED;
      mockSlotDao.confirmBookingAndReserveSlot.mockRejectedValue(transactionError);

      await expect(bookingService.confirmBooking(validRequest))
        .rejects.toThrow(Error);
    });
  });

  describe('cancelBooking', () => {
    const validRequest = { bookingId: 'booking-123' };
    const mockBooking = {
      bookingId: 'booking-123',
      providerId: 'provider-123',
      slotId: '2024-01-15#10:00',
      state: BookingState.PENDING
    };

    it('should cancel booking successfully', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(mockBooking as any);
      mockSlotDao.cancelBookingAndReleaseSlot.mockResolvedValue(undefined);

      const result = await bookingService.cancelBooking(validRequest);

      expect(result).toEqual({
        bookingId: 'booking-123',
        state: BookingState.CANCELLED,
        cancelledAt: expect.any(String),
        message: 'Booking cancelled and slot released'
      });
      expect(mockSlotDao.cancelBookingAndReleaseSlot).toHaveBeenCalledWith(
        'booking-123',
        'provider-123',
        '2024-01-15#10:00'
      );
    });

    it('should throw BookingNotFoundError if booking does not exist', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(undefined);

      await expect(bookingService.cancelBooking(validRequest))
        .rejects.toThrow(BookingNotFoundError);
    });

    it('should throw Error on transaction cancellation', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(mockBooking as any);
      const transactionError = new Error('Transaction cancelled');
      transactionError.name = DynamoDBErrorName.TRANSACTION_CANCELLED;
      mockSlotDao.cancelBookingAndReleaseSlot.mockRejectedValue(transactionError);

      await expect(bookingService.cancelBooking(validRequest))
        .rejects.toThrow(Error);
    });

    it('should throw Error on throttling', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(mockBooking as any);
      const throttleError = new Error('Throttling');
      throttleError.name = DynamoDBErrorName.PROVISIONED_THROUGHPUT_EXCEEDED;
      mockSlotDao.cancelBookingAndReleaseSlot.mockRejectedValue(throttleError);

      await expect(bookingService.cancelBooking(validRequest))
        .rejects.toThrow(Error);
    });
  });
});
