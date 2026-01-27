"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingTransitions = void 0;
exports.BookingTransitions = {
    PENDING: ["CONFIRMED", "CANCELLED", "EXPIRED"],
    CONFIRMED: ["CANCELLED"],
    CANCELLED: [],
    EXPIRED: [],
};
//# sourceMappingURL=booking-state.js.map