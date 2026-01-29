// DynamoDB Key Builders
export const Keys = {
    provider: (providerId: string) => ({
      PK: `PROVIDER#${providerId}`,
      SK: "METADATA",
    }),
    availability: (providerId: string, date: string) => ({
      PK: `PROVIDER#${providerId}`,
      SK: `AVAILABILITY#${date}`,
    }),
    slot: (providerId: string, date: string, time: string) => ({
      PK: `PROVIDER#${providerId}`,
      SK: `SLOT#${date}#${time}`,
    }),
    booking: (bookingId: string) => ({
      PK: `BOOKING#${bookingId}`,
      SK: "METADATA",
    }),
  };