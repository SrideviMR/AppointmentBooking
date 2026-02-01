export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validators = {
  bookingId: (bookingId: string | undefined): ValidationResult => {
    if (!bookingId || bookingId.trim() === '') {
      return { isValid: false, error: "Booking ID is required" };
    }

    // Handle booking- prefix format
    let uuidPart = bookingId;
    if (bookingId.startsWith('booking-')) {
      uuidPart = bookingId.substring(8); // Remove 'booking-' prefix
    }

    // UUID v4 validation with proper version and variant bits
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuidPart)) {
      return { isValid: false, error: "Invalid booking ID format" };
    }

    return { isValid: true };
  },

  createBookingInput: (input: any): ValidationResult => {
    if (!input) {
      return { isValid: false, error: "Request body is required" };
    }

    if (!input.providerId || !input.slotId || !input.userId) {
      return { isValid: false, error: "providerId, slotId, and userId are required" };
    }

    // Validate slotId format (date#time)
    const slotParts = input.slotId.split("#");
    if (slotParts.length !== 2) {
      return { isValid: false, error: "Invalid slotId format. Expected: date#time" };
    }

    return { isValid: true };
  }
};