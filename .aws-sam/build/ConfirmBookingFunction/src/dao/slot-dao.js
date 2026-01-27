"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slotDao = void 0;
const dynamodb_1 = require("../utils/dynamodb");
const types_1 = require("../types");
const time_1 = require("../utils/time");
/**
 * Slot statuses:
 * AVAILABLE → HELD → CONFIRMED
 * HELD → AVAILABLE (on expiry or cancel)
 */
const holdSlot = async (providerId, slotId, bookingId, holdExpiresAt) => {
    const [date, time] = slotId.split("#");
    return (0, dynamodb_1.updateItem)(types_1.Keys.slot(providerId, date, time), `
      SET 
        #status = :held,
        heldBy = :bookingId,
        holdExpiresAt = :ttl
    `, {
        ":held": "HELD",
        ":available": "AVAILABLE",
        ":bookingId": bookingId,
        ":ttl": holdExpiresAt,
    }, {
        "#status": "status",
    }, "#status = :available" // 🔒 atomic lock
    );
};
/**
 * Confirm slot — only if it is HELD by the same booking
 */
const confirmSlot = async (providerId, slotId, bookingId) => {
    const [date, time] = slotId.split("#");
    return (0, dynamodb_1.updateItem)(types_1.Keys.slot(providerId, date, time), `
      SET 
        #status = :confirmed,
        confirmedAt = :confirmedAt
      REMOVE 
        heldBy,
        holdExpiresAt
    `, {
        ":confirmed": "CONFIRMED",
        ":held": "HELD",
        ":bookingId": bookingId,
        ":confirmedAt": (0, time_1.getCurrentTimestamp)(),
    }, {
        "#status": "status",
    }, "#status = :held AND heldBy = :bookingId");
};
/**
 * Release slot — used for:
 * - booking expiry
 * - booking cancellation
 */
const releaseSlot = async (providerId, slotId, bookingId) => {
    const [date, time] = slotId.split("#");
    return (0, dynamodb_1.updateItem)(types_1.Keys.slot(providerId, date, time), `
      SET #status = :available
      REMOVE heldBy, holdExpiresAt
    `, {
        ":available": "AVAILABLE",
        ":bookingId": bookingId,
    }, {
        "#status": "status",
    }, "heldBy = :bookingId");
};
exports.slotDao = {
    holdSlot,
    confirmSlot,
    releaseSlot,
};
//# sourceMappingURL=slot-dao.js.map