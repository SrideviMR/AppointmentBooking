export interface Availability {
    PK: string; // PROVIDER#{providerId}
    SK: string; // AVAILABILITY#{date}
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    createdAt: string;
  }
  
  export interface CreateAvailabilityInput {
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    slotDurationMinutes: number;
  }
  