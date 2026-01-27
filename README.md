# Appointment Booking System

A scalable, serverless appointment booking system built on AWS with DynamoDB and SQS for high concurrency and reliability.

## Architecture Overview

### System Components

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   API Gateway   │────│    Lambda    │────│    DynamoDB     │
│                 │    │   Functions  │    │   Single Table  │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                       ┌──────────────┐    ┌─────────────────┐
                       │     SQS      │────│    Workers      │
                       │    Queue     │    │   (Lambda)      │
                       └──────────────┘    └─────────────────┘
```

### Core Services

1. **API Layer**: REST endpoints for booking operations
2. **Data Layer**: Single-table DynamoDB design with GSIs
3. **Queue Layer**: SQS for async processing and reliability
4. **Worker Layer**: Background processors for booking lifecycle

## Data Model

### Single Table Design

All entities stored in one DynamoDB table with composite keys:

```
Entity Type    | PK                    | SK                     | GSIs
---------------|----------------------|------------------------|------------------
Provider       | PROVIDER#{id}        | METADATA               | -
Availability   | PROVIDER#{id}        | AVAILABILITY#{date}    | -
Slot           | PROVIDER#{id}        | SLOT#{date}#{time}     | -
Booking        | BOOKING#{id}         | METADATA               | GSI1,GSI2,GSI3
```

### Global Secondary Indexes

- **GSI1**: User bookings (`USER#{userId}` → `BOOKING#{timestamp}`)
- **GSI2**: Provider bookings (`PROVIDER#{id}` → `BOOKING#{timestamp}`)
- **GSI3**: Status-based queries (`STATUS#{state}` → `EXPIRES#{timestamp}`)

## Key Design Decisions

### 1. Optimistic Concurrency Control

**Decision**: Use DynamoDB conditional updates for slot reservations
```typescript
// Atomic slot hold operation
await updateItem(slotKey, "SET #status = :held", conditions, "#status = :available")
```

**Benefits**:
- Prevents double-booking at database level
- No distributed locks needed
- High performance under contention

**Trade-offs**:
- Failed requests need retry logic
- ConditionalCheckFailedException handling required

### 2. Two-Phase Booking Process

**Decision**: PENDING → CONFIRMED booking states with expiration
```
1. Hold slot (5min expiration)
2. Create PENDING booking
3. User confirms → CONFIRMED
4. Auto-expire if not confirmed
```

**Benefits**:
- Prevents abandoned reservations
- Better user experience (immediate feedback)
- Automatic cleanup of stale bookings

**Trade-offs**:
- More complex state management
- Background worker required for cleanup

### 3. Asynchronous Processing

**Decision**: SQS queue for booking operations
```typescript
// Immediate response, async processing
await sendMessage(bookingQueue, bookingData);
return { status: "PENDING", bookingId };
```

**Benefits**:
- Fast API response times
- Decoupled architecture
- Built-in retry and DLQ handling

**Trade-offs**:
- Eventually consistent
- More complex error handling
- Additional infrastructure cost

### 4. Single Table DynamoDB Design

**Decision**: All entities in one table with access patterns via GSIs

**Benefits**:
- Cost efficient (one table)
- Atomic transactions possible
- Optimized for access patterns

**Trade-offs**:
- Complex key design
- Harder to understand/maintain
- Limited query flexibility

## Concurrency Handling

### Slot Reservation Race Conditions

```typescript
// Atomic operation prevents double booking
const holdSlot = async (providerId, slotId, bookingId) => {
  try {
    await updateItem(
      Keys.slot(providerId, date, time),
      "SET #status = :held, heldBy = :bookingId",
      { ":held": "HELD", ":bookingId": bookingId },
      { "#status": "status" },
      "#status = :available"  // Conditional check
    );
    return true;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return false; // Slot already taken
    }
    throw err;
  }
};
```

### State Transition Safety

```typescript
// Only allow valid state transitions
const updateBookingState = async ({ bookingId, from, to }) => {
  const allowedStates = Array.isArray(from) ? from : [from];
  
  await updateItem(
    Keys.booking(bookingId),
    "SET #state = :to",
    { ":to": to, ...fromConditions },
    { "#state": "state" },
    `#state IN (${allowedStates.map((_, i) => `:from${i}`).join(", ")})`
  );
};
```

## Performance Optimizations

### 1. Read Patterns
- **Hot partitions**: Distribute slots across time-based keys
- **GSI queries**: Efficient user/provider booking lookups
- **Projection**: ALL attributes in GSIs for single-query operations

### 2. Write Patterns
- **Batch operations**: Slot creation uses BatchWriteItem
- **Conditional updates**: Prevent unnecessary writes
- **TTL attributes**: Automatic cleanup of expired data

### 3. Caching Strategy
- **API Gateway caching**: Static responses (provider info)
- **Lambda container reuse**: Connection pooling
- **DynamoDB DAX**: Could be added for read-heavy workloads

## Scalability Considerations

### Horizontal Scaling
- **Stateless Lambdas**: Auto-scale based on demand
- **DynamoDB on-demand**: Automatic capacity scaling
- **SQS**: Handles traffic spikes with buffering

### Partition Strategy
```
Provider slots: PROVIDER#{id}#SLOT#{date}#{time}
- Distributes load across providers
- Time-based distribution within provider
- Avoids hot partitions
```

### Bottlenecks & Mitigation
1. **DynamoDB throttling**: On-demand billing mode
2. **Lambda concurrency**: Reserved concurrency for critical functions
3. **API Gateway limits**: Rate limiting and caching

## Reliability & Error Handling

### Failure Modes

1. **Slot booking conflicts**
   - Graceful degradation with user feedback
   - Retry with exponential backoff

2. **Worker processing failures**
   - SQS DLQ for poison messages
   - Manual intervention alerts

3. **Database unavailability**
   - Circuit breaker pattern
   - Fallback responses

### Data Consistency

- **Strong consistency**: Critical booking operations
- **Eventually consistent**: Non-critical reads (GSI queries)
- **Compensating transactions**: Booking cancellation cleanup

## Security

### Authentication & Authorization
- API Gateway with AWS IAM/Cognito integration
- Function-level permissions (least privilege)
- Resource-based policies

### Data Protection
- Encryption at rest (DynamoDB)
- Encryption in transit (HTTPS/TLS)
- No sensitive data in logs

## Monitoring & Observability

### Metrics
- **Business**: Booking success rate, slot utilization
- **Technical**: Lambda duration, DynamoDB throttles, SQS queue depth
- **Custom**: Booking funnel conversion rates

### Logging
```typescript
logger.info("Slot held successfully", { 
  providerId, 
  slotId, 
  bookingId,
  duration: Date.now() - startTime 
});
```

### Alerting
- Failed booking rate > 5%
- Queue depth > 1000 messages
- Lambda error rate > 1%

## Cost Optimization

### DynamoDB
- On-demand billing for variable workloads
- Single table design reduces costs
- TTL for automatic data cleanup

### Lambda
- Right-sized memory allocation
- Provisioned concurrency for predictable workloads
- ARM Graviton2 processors for cost savings

### SQS
- Standard queues (not FIFO) for cost efficiency
- Batch processing to reduce API calls

## Trade-offs Summary

| Decision | Benefits | Drawbacks |
|----------|----------|-----------|
| Single Table | Cost efficient, atomic transactions | Complex design, limited flexibility |
| Async Processing | Fast responses, decoupled | Eventually consistent, complex error handling |
| Optimistic Locking | High performance, no deadlocks | Retry logic needed, potential conflicts |
| Two-phase Booking | Better UX, prevents abandonment | Complex state management, cleanup needed |
| Serverless Architecture | Auto-scaling, pay-per-use | Cold starts, vendor lock-in |

## Future Enhancements

1. **Multi-region deployment** for global availability
2. **GraphQL API** for flexible client queries  
3. **Real-time notifications** via WebSocket/EventBridge
4. **ML-based demand forecasting** for capacity planning
5. **Blockchain integration** for immutable booking records

## Getting Started

```bash
# Deploy infrastructure
npm run deploy

# Run tests
npm test

# Monitor logs
npm run logs -- createBooking
```

## API Endpoints

- `POST /providers` - Create provider
- `POST /providers/{id}/availability` - Set availability
- `GET /providers/{id}/slots?date=YYYY-MM-DD` - Get available slots
- `POST /bookings` - Create booking
- `POST /bookings/{id}/confirm` - Confirm booking
- `POST /bookings/{id}/cancel` - Cancel booking
- `GET /bookings/{id}` - Get booking details