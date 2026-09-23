import moment from "moment"

// "Change all dates display in DD-MMM-YY Format like 02-SEP-26" - the app-
// wide date style. Moment has no built-in uppercase-month token, so every
// formatted string here is upper-cased afterwards - safe even when time is
// included, since HH:mm/am-pm have no lowercase letters that shouldn't be
// upper-cased (AM/PM reads fine either way).
export function getFormattedDate(timestamp) {
    return moment(timestamp).format("DD-MMM-YY HH:mm").toUpperCase()
}

export function getFormattedDateTimeGMT(timestamp) {
    if (!timestamp) return ""
    return moment.utc(timestamp).format("DD-MMM-YY hh:mm a").toUpperCase()
}

// Plain date, no time - e.g. an Order Date or a Deleted At date-only column.
export function getFormattedDateOnly(value) {
    return value ? moment(value).format("DD-MMM-YY").toUpperCase() : ""
}

// Date + time, 12-hour clock - the "Last edited by X on ..." pattern shared
// across most tables' edit dialogs, and any other timestamp that isn't
// GMT-labeled (see getFormattedDateTimeGMT above for those).
export function getFormattedDateTime(value) {
    return value ? moment(value).format("DD-MMM-YY h:mm A").toUpperCase() : ""
}

// Circuit bill/change dates are stored (and entered) as free-text
// "DD-MM-YYYY" (matches circuit.service.js's BULK_DATE_FORMAT, and the CSV
// bulk-upload convention) - reformatted only for display here, via
// CircuitTable.js/FinanceDashboard.js, never touched anywhere it's read
// back as input. Falls back to the raw value for anything that isn't a
// clean DD-MM-YYYY string.
export function getFormattedStoredDate(value) {
    const parsed = moment(value, "DD-MM-YYYY", true)
    return parsed.isValid() ? parsed.format("DD-MMM-YY").toUpperCase() : value
}