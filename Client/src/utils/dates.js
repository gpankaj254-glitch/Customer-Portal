import moment from "moment"

export function getFormattedDate(timestamp) {
    return moment(timestamp).format("DD MMM YY HH:mm")
}

export function getFormattedDateTimeGMT(timestamp) {
    if (!timestamp) return ""
    return moment.utc(timestamp).format("DD/MM/YYYY hh:mm a")
}