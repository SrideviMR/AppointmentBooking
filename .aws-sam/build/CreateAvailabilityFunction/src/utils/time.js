"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTimeSlots = generateTimeSlots;
exports.generateExpirationTime = generateExpirationTime;
exports.isExpired = isExpired;
exports.formatDate = formatDate;
exports.getCurrentTimestamp = getCurrentTimestamp;
function generateTimeSlots(startTime, endTime, durationMinutes) {
    const slots = [];
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    while (currentMinutes < endMinutes) {
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        const timeSlot = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}`;
        slots.push(timeSlot);
        currentMinutes += durationMinutes;
    }
    return slots;
}
function generateExpirationTime(minutesFromNow = 5) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutesFromNow);
    return now.toISOString();
}
function isExpired(expiresAt) {
    return new Date(expiresAt) < new Date();
}
function formatDate(date) {
    return date.toISOString().split("T")[0];
}
function getCurrentTimestamp() {
    return new Date().toISOString();
}
//# sourceMappingURL=time.js.map