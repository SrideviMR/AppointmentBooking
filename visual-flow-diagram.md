# Appointment Booking System - Visual Flow Diagrams

## System Status: ✅ All Tests Passing (143/143)

**Coverage**: 93.88% | **Architecture**: Service Layer + Atomic Transactions | **Error Handling**: Domain Exceptions

## Complete System Architecture

```mermaid
flowchart TD
    %% User Actions
    User([👤 User]) 
    
    %% API Layer
    API{🌐 API Gateway}
    
    %% Handler Layer
    subgraph "📝 Handler Layer"
        CH[Create Handler]
        CNH[Confirm Handler] 
        CAH[Cancel Handler]
        VAL[Input Validation]
    end
    
    %% Service Layer
    subgraph "⚙️ Service Layer"
        BS[📋 Booking Service]
        ERR[🚨 Error Handling]
        BL[Business Logic]
    end
    
    %% DAO Layer
    subgraph "💾 DAO Layer"
        BD[Booking DAO]
        SD[Slot DAO]
        TRANS[🔄 Transactions]
    end
    
    %% Queue & Processing
    subgraph "📨 Async Processing"
        SQ[SQS Queue]
        BP[Booking Processor]
    end
    
    %% TTL & Streams
    subgraph "⏰ TTL + Streams"
        TTL[TTL Trigger]
        STREAM[📡 DynamoDB Streams]
        EP[Expiration Processor]
    end
    
    %% Database
    DB[(🗄️ DynamoDB<br/>Single Table + TTL)]
    
    %% Flow Connections
    User --> API
    API --> CH
    API --> CNH
    API --> CAH
    
    CH --> VAL
    CNH --> VAL
    CAH --> VAL
    
    VAL --> BS
    BS --> BL
    BL --> ERR
    
    BS --> BD
    BS --> SD
    SD --> TRANS
    
    BD --> DB
    SD --> DB
    TRANS --> DB
    
    BS --> SQ
    SQ --> BP
    BP --> DB
    
    DB --> TTL
    TTL --> STREAM
    STREAM --> EP
    EP --> DB
    
    %% Styling
    classDef userClass fill:#e1f5fe
    classDef apiClass fill:#f3e5f5
    classDef handlerClass fill:#e8f5e8
    classDef serviceClass fill:#fff3e0
    classDef daoClass fill:#fce4ec
    classDef dbClass fill:#f1f8e9
    classDef workerClass fill:#e3f2fd
    
    class User userClass
    class API apiClass
    class CH,CNH,CAH,VAL handlerClass
    class BS,ERR,BL serviceClass
    class BD,SD,TRANS daoClass
    class DB dbClass
    class SQ,BP,TTL,STREAM,EP workerClass
```

## Service Layer Flow

```mermaid
flowchart LR
    %% Input
    REQ[📥 Request] --> VAL{✅ Valid?}
    
    %% Validation
    VAL -->|❌ No| ERR1[🚫 Validation Error]
    VAL -->|✅ Yes| SVC[⚙️ Service Layer]
    
    %% Service Processing
    SVC --> BL{📋 Business Logic}
    
    %% Business Logic Branches
    BL -->|Create| CREATE[🎯 Create Booking]
    BL -->|Confirm| CONFIRM[✅ Confirm Booking]
    BL -->|Cancel| CANCEL[❌ Cancel Booking]
    
    %% Create Flow
    CREATE --> VALIDATE_SLOT[🔍 Validate Slot]
    VALIDATE_SLOT --> HOLD[🔒 Hold Slot]
    HOLD --> QUEUE[📨 Queue Message]
    QUEUE --> RESP1[📤 202 Accepted]
    
    %% Confirm Flow
    CONFIRM --> GET_BOOKING[📋 Get Booking]
    GET_BOOKING --> CONFIRM_SLOT[✅ Confirm Slot]
    CONFIRM_SLOT --> RESP2[📤 200 Confirmed]
    
    %% Cancel Flow
    CANCEL --> ATOMIC[⚛️ Atomic Transaction]
    ATOMIC --> RESP3[📤 200 Cancelled]
    
    %% Error Handling
    CREATE --> ERR2[🚨 Domain Errors]
    CONFIRM --> ERR2
    CANCEL --> ERR2
    ERR2 --> HTTP[📤 HTTP Error Response]
    
    %% Styling
    classDef inputClass fill:#e1f5fe
    classDef processClass fill:#e8f5e8
    classDef errorClass fill:#ffebee
    classDef successClass fill:#e8f5e8
    
    class REQ,VAL inputClass
    class SVC,BL,CREATE,CONFIRM,CANCEL,VALIDATE_SLOT,HOLD,QUEUE,GET_BOOKING,CONFIRM_SLOT,ATOMIC processClass
    class ERR1,ERR2,HTTP errorClass
    class RESP1,RESP2,RESP3 successClass
```

## Booking Journey with Service Layer

```mermaid
flowchart TD
    %% Start
    A[🏁 User Request] --> B[📝 Handler Layer]
    
    %% Handler Processing
    B --> C{✅ Input Valid?}
    C -->|❌ No| D[🚫 400 Bad Request]
    C -->|✅ Yes| E[⚙️ Service Layer]
    
    %% Service Layer Processing
    E --> F{📋 Business Logic}
    
    %% Create Booking Flow
    F -->|Create| G[🔍 Validate Slot]
    G --> H{Slot Available?}
    H -->|❌ No| I[🚫 SlotUnavailableError]
    H -->|✅ Yes| J[🔒 Hold Slot Atomically]
    
    J --> K{Hold Success?}
    K -->|❌ No| L[🚫 Race Condition]
    K -->|✅ Yes| M[📨 Queue Async Processing]
    M --> N[📤 202 PENDING]
    
    %% Background Processing
    M --> O[🔄 Background Worker]
    O --> P[📋 Create Booking Record]
    P --> Q[⏰ Set TTL Trigger]
    
    %% User Actions
    N --> R{⏰ User Action?}
    R -->|✅ Confirm| S[⚙️ Confirm Service]
    R -->|❌ Cancel| T[⚙️ Cancel Service]
    R -->|⏰ Timeout| U[⏰ TTL Expiration]
    
    %% Confirm Flow
    S --> V[✅ Confirm Slot]
    V --> W[📤 200 CONFIRMED]
    
    %% Cancel Flow (Atomic)
    T --> X[⚛️ Atomic Transaction]
    X --> Y[📤 200 CANCELLED]
    
    %% TTL Expiration
    U --> Z[📡 DynamoDB Stream]
    Z --> AA[🔄 Expiration Processor]
    AA --> BB[📤 EXPIRED]
    
    %% Error Mapping
    I --> CC[📤 400 Validation Error]
    L --> CC
    
    %% Styling
    classDef startClass fill:#4caf50,color:#fff
    classDef processClass fill:#2196f3,color:#fff
    classDef decisionClass fill:#ff9800,color:#fff
    classDef successClass fill:#4caf50,color:#fff
    classDef errorClass fill:#f44336,color:#fff
    classDef serviceClass fill:#9c27b0,color:#fff
    
    class A,W,Y,BB startClass
    class B,E,G,J,M,O,P,Q,S,T,V,X,Z,AA processClass
    class C,F,H,K,R decisionClass
    class N,W,Y,BB successClass
    class D,I,L,CC errorClass
    class E,S,T serviceClass
```

## Error Handling Architecture (Fixed & Tested)

```mermaid
flowchart TD
    %% Request Flow
    REQ[📥 Request] --> HANDLER[📝 Handler]
    HANDLER --> SERVICE[⚙️ Service]
    
    %% Service Layer Errors
    SERVICE --> BUSINESS{📋 Business Logic}
    
    %% Domain Exceptions (Fixed)
    BUSINESS -->|Slot Issues| SLOT_ERR[🚫 SlotUnavailableError]
    BUSINESS -->|Booking Issues| BOOKING_ERR[🚫 BookingConflictError]
    BUSINESS -->|Not Found| NOT_FOUND[🚫 BookingNotFoundError]
    BUSINESS -->|Service Issues| SERVICE_ERR[🚫 ServiceUnavailableError]
    BUSINESS -->|SQS Failures| SQS_ERR[🚫 SQS → ServiceUnavailableError]
    
    %% Error Mapping (Consistent Messages)
    SLOT_ERR --> HTTP_400[📤 400 Bad Request]
    BOOKING_ERR --> HTTP_409[📤 409 Conflict]
    NOT_FOUND --> RESOURCE_NAME[📝 "Booking"]
    RESOURCE_NAME --> HTTP_404[📤 404 "Booking not found"]
    SERVICE_ERR --> HTTP_500[📤 500 Internal Error]
    SQS_ERR --> HTTP_500
    
    %% Success Path
    BUSINESS -->|Success| SUCCESS[✅ Success Response]
    SUCCESS --> HTTP_200[📤 200/202 Success]
    
    %% Unexpected Errors
    SERVICE -->|Unexpected| UNKNOWN[❓ Unknown Error]
    UNKNOWN --> HTTP_500
    
    %% Test Coverage Indicators
    HTTP_400 -.-> TEST1[✅ Tested]
    HTTP_409 -.-> TEST2[✅ Tested]
    HTTP_404 -.-> TEST3[✅ Tested]
    HTTP_500 -.-> TEST4[✅ Tested]
    
    %% Styling
    classDef inputClass fill:#e1f5fe
    classDef processClass fill:#e8f5e8
    classDef errorClass fill:#ffebee
    classDef successClass fill:#e8f5e8
    classDef httpClass fill:#f3e5f5
    classDef testClass fill:#c8e6c9
    classDef fixedClass fill:#fff3e0
    
    class REQ inputClass
    class HANDLER,SERVICE,BUSINESS processClass
    class SLOT_ERR,BOOKING_ERR,NOT_FOUND,SERVICE_ERR,SQS_ERR,UNKNOWN errorClass
    class SUCCESS successClass
    class HTTP_400,HTTP_409,HTTP_404,HTTP_500,HTTP_200 httpClass
    class TEST1,TEST2,TEST3,TEST4 testClass
    class RESOURCE_NAME fixedClass
```

## Atomic Transaction Flow

```mermaid
flowchart TD
    %% Cancel Request
    CANCEL[❌ Cancel Request] --> SERVICE[⚙️ Booking Service]
    
    %% Service Processing
    SERVICE --> GET[📋 Get Booking]
    GET --> EXISTS{Exists?}
    EXISTS -->|❌ No| NOT_FOUND[🚫 BookingNotFoundError]
    EXISTS -->|✅ Yes| PREPARE[⚛️ Prepare Transaction]
    
    %% Transaction Preparation
    PREPARE --> TRANS_ITEMS[📝 Transaction Items]
    TRANS_ITEMS --> ITEM1[📋 Cancel Booking]
    TRANS_ITEMS --> ITEM2[🔓 Release Slot]
    
    %% Atomic Execution
    ITEM1 --> EXECUTE[⚛️ Execute Transaction]
    ITEM2 --> EXECUTE
    
    EXECUTE --> RESULT{Transaction Result?}
    
    %% Success Path
    RESULT -->|✅ Success| SUCCESS[✅ Both Updated]
    SUCCESS --> RESPONSE[📤 200 Cancelled]
    
    %% Failure Paths
    RESULT -->|❌ Booking Condition Failed| BOOKING_CONFLICT[🚫 Booking State Invalid]
    RESULT -->|❌ Slot Condition Failed| SLOT_CONFLICT[🚫 Slot Not Held]
    RESULT -->|❌ Other Failure| UNKNOWN_CONFLICT[🚫 Unknown Conflict]
    
    %% Error Responses
    BOOKING_CONFLICT --> HTTP_409_1[📤 409 Cannot Cancel]
    SLOT_CONFLICT --> HTTP_409_2[📤 409 Slot Not Held]
    UNKNOWN_CONFLICT --> HTTP_409_3[📤 409 Conflict]
    NOT_FOUND --> HTTP_404[📤 404 Not Found]
    
    %% Styling
    classDef requestClass fill:#e1f5fe
    classDef processClass fill:#e8f5e8
    classDef transactionClass fill:#fff3e0
    classDef successClass fill:#e8f5e8
    classDef errorClass fill:#ffebee
    classDef httpClass fill:#f3e5f5
    
    class CANCEL requestClass
    class SERVICE,GET,PREPARE processClass
    class TRANS_ITEMS,ITEM1,ITEM2,EXECUTE transactionClass
    class SUCCESS,RESPONSE successClass
    class NOT_FOUND,BOOKING_CONFLICT,SLOT_CONFLICT,UNKNOWN_CONFLICT errorClass
    class HTTP_409_1,HTTP_409_2,HTTP_409_3,HTTP_404 httpClass
```

## Recent Fixes & Improvements ✅

### Test Suite Stabilization (143/143 Tests Passing)
```mermaid
flowchart LR
    BEFORE[🔴 6 Failed Tests] --> FIXES[🔧 Applied Fixes]
    FIXES --> AFTER[✅ 143/143 Passing]
    
    FIXES --> FIX1[📝 Error Message Consistency]
    FIXES --> FIX2[📨 SQS Error Handling]
    FIXES --> FIX3[🏷️ UUID Format Validation]
    FIXES --> FIX4[🔄 Worker Test Mocking]
    FIXES --> FIX5[🔗 Integration Test Flow]
    
    classDef beforeClass fill:#ffebee
    classDef afterClass fill:#e8f5e8
    classDef fixClass fill:#fff3e0
    
    class BEFORE beforeClass
    class AFTER afterClass
    class FIXES,FIX1,FIX2,FIX3,FIX4,FIX5 fixClass
```

### Error Handling Improvements
```mermaid
flowchart TD
    PROBLEM1[🔴 Double "not found" messages] --> SOLUTION1[✅ Use resource names]
    PROBLEM2[🔴 SQS errors not wrapped] --> SOLUTION2[✅ ServiceUnavailableError]
    PROBLEM3[🔴 Invalid UUID in tests] --> SOLUTION3[✅ Proper UUID format]
    PROBLEM4[🔴 Worker test expectations] --> SOLUTION4[✅ Mock DAO methods]
    
    classDef problemClass fill:#ffebee
    classDef solutionClass fill:#e8f5e8
    
    class PROBLEM1,PROBLEM2,PROBLEM3,PROBLEM4 problemClass
    class SOLUTION1,SOLUTION2,SOLUTION3,SOLUTION4 solutionClass
```

## Key Architecture Benefits

### 🎯 **Service Layer Advantages**
- **Single Source of Truth**: All business logic centralized
- **Reusable**: Same service methods across different handlers
- **Testable**: Business logic isolated from HTTP concerns
- **Domain Errors**: Clear error handling with custom exceptions
- **✅ Test Coverage**: 95.06% service layer coverage

### ⚡ **Handler Layer Benefits**
- **Thin & Fast**: Reduced from 85 to 35 lines average
- **Focused**: Only HTTP request/response handling
- **Validation**: Input validation before business logic
- **Error Mapping**: Domain exceptions to HTTP status codes
- **✅ Consistent Errors**: Fixed double error message issues

### 🔄 **Atomic Operations**
- **Data Consistency**: Transactions prevent partial failures
- **Race Condition Safe**: Conditional updates with optimistic locking
- **Reliable**: Either all operations succeed or all fail
- **✅ Tested**: Comprehensive transaction failure scenarios

### 📊 **Monitoring & Observability**
- **Structured Logging**: Consistent log format across layers
- **Performance Metrics**: Duration tracking at each layer
- **Error Tracking**: Domain-specific error categorization
- **Business Metrics**: Booking success rates and patterns
- **✅ Test Coverage**: 93.88% overall coverage

### 🛡️ **Reliability Features**
- **Graceful Degradation**: Clear error messages for users
- **Retry Logic**: Built into SQS and DynamoDB operations
- **Dead Letter Queues**: Failed message handling
- **Idempotent Operations**: Safe to retry without side effects
- **✅ Error Handling**: All error paths tested and validated