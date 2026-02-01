import { bookingService, BookingNotFoundError, BookingConflictError, ServiceUnavailableError, SlotUnavailableError } from '../../src/services/booking-service';
import { bookingDao } from '../../src/dao/booking-dao';
import { slotDao } from '../../src/dao/slot-dao';
import { sendMessage } from '../../src/utils/sqs';
import { queryItems } from '../../src/utils/dynamodb';

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
      // Mock slot exists and is available
      mockQueryItems.mockResolvedValue([
        { status: 'AVAILABLE', PK: 'PROVIDER#provider-123', SK: 'SLOT#2024-01-15#10:00' }
      ]);
      mockSlotDao.holdSlot.mockResolvedValue(true);
      mockSendMessage.mockResolvedValue({} as any);

      const result = await bookingService.createBooking(validRequest);

      expect(result).toEqual({
        bookingId: 'booking-test-uuid-123',
        status: 'PENDING',
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

    it('should throw SlotUnavailableError when slot does not exist', async () => {
      mockQueryItems.mockResolvedValue([]);

      await expect(bookingService.createBooking(validRequest))
        .rejects.toThrow(SlotUnavailableError);
      await expect(bookingService.createBooking(validRequest))
        .rejects.toThrow('Slot does not exist. Please create availability first.');
    });

    it('should throw SlotUnavailableError when slot is held', async () => {
      mockQueryItems.mockResolvedValue([
        { 
          status: 'HELD', 
          holdExpiresAt: new Date(Date.now() + 300000).toISOString() // 5 minutes from now
        }
      ]);

      await expect(bookingService.createBooking(validRequest))
        .rejects.toThrow(SlotUnavailableError);
    });

    it('should throw SlotUnavailableError when slot is booked', async () => {
      mockQueryItems.mockResolvedValue([
        { status: 'BOOKED' }
      ]);

      await expect(bookingService.createBooking(validRequest))
        .rejects.toThrow('Slot is already booked. Please select another slot.');
    });

    it('should throw SlotUnavailableError when hold fails', async () => {
      mockQueryItems.mockResolvedValue([{ status: 'AVAILABLE' }]);
      mockSlotDao.holdSlot.mockResolvedValue(false);

      await expect(bookingService.createBooking(validRequest))
        .rejects.toThrow('Slot is held by another booking');
    });

    it('should throw ServiceUnavailableError on DynamoDB throttling', async () => {
      mockQueryItems.mockResolvedValue([{ status: 'AVAILABLE' }]);
      const throttleError = new Error('Throttling');
      throttleError.name = 'ProvisionedThroughputExceededException';
      mockSlotDao.holdSlot.mockRejectedValue(throttleError);

      await expect(bookingService.createBooking(validRequest))
        .rejects.toThrow(ServiceUnavailableError);
    });
  });

  describe('confirmBooking', () => {
    const validRequest = { bookingId: 'booking-123' };
    const mockBooking = {
      bookingId: 'booking-123',
      providerId: 'provider-123',
      slotId: '2024-01-15#10:00',
      state: 'PENDING'
    };

    it('should confirm booking successfully', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(mockBooking as any);
      mockBookingDao.confirm.mockResolvedValue(undefined);
      mockSlotDao.confirmSlot.mockResolvedValue(true);

      const result = await bookingService.confirmBooking(validRequest);

      expect(result).toEqual({
        bookingId: 'booking-123',
        state: 'CONFIRMED',
        confirmedAt: expect.any(String),
        message: 'Booking confirmed successfully'
      });
      expect(mockBookingDao.confirm).toHaveBeenCalledWith('booking-123');
      expect(mockSlotDao.confirmSlot).toHaveBeenCalledWith(
        'provider-123',
        '2024-01-15#10:00',
        'booking-123'
      );
    });

    it('should throw BookingNotFoundError when booking does not exist', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(undefined);

      await expect(bookingService.confirmBooking(validRequest))
        .rejects.toThrow(BookingNotFoundError);
    });

    it('should throw BookingConflictError when slot confirmation fails', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(mockBooking as any);
      mockBookingDao.confirm.mockResolvedValue(undefined);
      mockSlotDao.confirmSlot.mockResolvedValue(false);

      await expect(bookingService.confirmBooking(validRequest))
        .rejects.toThrow('Slot is no longer held by this booking');
    });

    it('should throw BookingConflictError on conditional check failure', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(mockBooking as any);
      const conditionalError = new Error('Conditional check failed');
      conditionalError.name = 'ConditionalCheckFailedException';
      mockBookingDao.confirm.mockRejectedValue(conditionalError);

      await expect(bookingService.confirmBooking(validRequest))
        .rejects.toThrow(BookingConflictError);
    });
  });

  describe('cancelBooking', () => {
    const validRequest = { bookingId: 'booking-123' };
    const mockBooking = {
      bookingId: 'booking-123',
      providerId: 'provider-123',
      slotId: '2024-01-15#10:00',
      state: 'PENDING'
    };

    it('should cancel booking successfully', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(mockBooking as any);
      mockSlotDao.cancelBookingAndReleaseSlot.mockResolvedValue(undefined);

      const result = await bookingService.cancelBooking(validRequest);

      expect(result).toEqual({
        bookingId: 'booking-123',
        state: 'CANCELLED',
        cancelledAt: expect.any(String),
        message: 'Booking cancelled and slot released'
      });
      expect(mockSlotDao.cancelBookingAndReleaseSlot).toHaveBeenCalledWith(
        'booking-123',
        'provider-123',
        '2024-01-15#10:00'
      );
    });

    it('should throw BookingNotFoundError when booking does not exist', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(undefined);

      await expect(bookingService.cancelBooking(validRequest))
        .rejects.toThrow(BookingNotFoundError);
    });

    it('should throw BookingConflictError on transaction cancellation', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(mockBooking as any);
      const transactionError = new Error('Transaction cancelled');
      transactionError.name = 'TransactionCanceledException';
      (transactionError as any).CancellationReasons = [
        { Code: 'ConditionalCheckFailed' },
        { Code: 'None' }
      ];
      mockSlotDao.cancelBookingAndReleaseSlot.mockRejectedValue(transactionError);

      await expect(bookingService.cancelBooking(validRequest))
        .rejects.toThrow(BookingConflictError);
    });

    it('should throw ServiceUnavailableError on throttling', async () => {
      mockBookingDao.getBookingById.mockResolvedValue(mockBooking as any);
      const throttleError = new Error('Throttling');
      throttleError.name = 'ThrottlingException';
      mockSlotDao.cancelBookingAndReleaseSlot.mockRejectedValue(throttleError);

      await expect(bookingService.cancelBooking(validRequest))
        .rejects.toThrow(ServiceUnavailableError);
    });
  });
});