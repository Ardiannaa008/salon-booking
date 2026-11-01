// Business errors. They carry no HTTP status: the api layer decides how to present them.

export class NotFoundError extends Error {}

/** The request is well formed but breaks a booking rule, such as a date in the past. */
export class BookingRuleError extends Error {}

/** Someone else already holds this slot. */
export class SlotTakenError extends Error {}
