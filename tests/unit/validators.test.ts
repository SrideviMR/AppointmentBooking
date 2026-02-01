import { validators } from '../../src/utils/validators';

describe('Validators', () => {
  describe('bookingId', () => {
    it('should validate correct UUID v4', () => {
      const validUUIDs = [
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'F47AC10B-58CC-4372-A567-0E02B2C3D479', // uppercase
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        'booking-e73ce6bc-cd97-47be-ab98-af486ed281f1', // with booking- prefix
        'booking-f47ac10b-58cc-4372-a567-0e02b2c3d479' // with booking- prefix
      ];

      validUUIDs.forEach(uuid => {
        const result = validators.bookingId(uuid);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        'f47ac10b-58cc-4372-a567', // too short
        'f47ac10b-58cc-4372-a567-0e02b2c3d479-extra', // too long
        'g47ac10b-58cc-4372-a567-0e02b2c3d479', // invalid character
        'f47ac10b58cc4372a5670e02b2c3d479', // no dashes
        'f47ac10b-58cc-0372-a567-0e02b2c3d479', // wrong version (0)
        'f47ac10b-58cc-6372-a567-0e02b2c3d479', // wrong version (6)
        'f47ac10b-58cc-4372-0567-0e02b2c3d479', // wrong variant (0)
        'f47ac10b-58cc-4372-c567-0e02b2c3d479' // wrong variant (c)
      ];

      invalidUUIDs.forEach(uuid => {
        const result = validators.bookingId(uuid);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid booking ID format');
      });
    });

    it('should reject undefined or empty booking ID', () => {
      const result1 = validators.bookingId(undefined);
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe('Booking ID is required');

      const result2 = validators.bookingId('');
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBe('Booking ID is required');
    });
  });

  describe('createBookingInput', () => {
    it('should validate correct input', () => {
      const validInputs = [
        {
          providerId: 'provider-123',
          slotId: '2024-01-15#10:00',
          userId: 'user-456'
        },
        {
          providerId: 'p1',
          slotId: '2024-12-31#23:59',
          userId: 'u1'
        }
      ];

      validInputs.forEach(input => {
        const result = validators.createBookingInput(input);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject null or undefined input', () => {
      const result1 = validators.createBookingInput(null);
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe('Request body is required');

      const result2 = validators.createBookingInput(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBe('Request body is required');
    });

    it('should reject missing required fields', () => {
      const invalidInputs = [
        { slotId: '2024-01-15#10:00', userId: 'user-456' }, // missing providerId
        { providerId: 'provider-123', userId: 'user-456' }, // missing slotId
        { providerId: 'provider-123', slotId: '2024-01-15#10:00' }, // missing userId
        { providerId: '', slotId: '2024-01-15#10:00', userId: 'user-456' }, // empty providerId
        { providerId: 'provider-123', slotId: '', userId: 'user-456' }, // empty slotId
        { providerId: 'provider-123', slotId: '2024-01-15#10:00', userId: '' } // empty userId
      ];

      invalidInputs.forEach(input => {
        const result = validators.createBookingInput(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('providerId, slotId, and userId are required');
      });
    });

    it('should reject invalid slotId format', () => {
      const invalidSlotIds = [
        '2024-01-15', // missing time
        '10:00', // missing date
        '2024-01-15#10:00#extra', // too many parts
        '2024-01-15-10:00', // wrong separator
        'invalid-format'
      ];

      invalidSlotIds.forEach(slotId => {
        const input = {
          providerId: 'provider-123',
          slotId,
          userId: 'user-456'
        };
        const result = validators.createBookingInput(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid slotId format. Expected: date#time');
      });
    });
  });
});