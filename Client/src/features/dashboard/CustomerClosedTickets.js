import * as React from "react"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import Alert from "@mui/material/Alert"
import _ from "lodash"
import moment from "moment"
import { useDispatch, useSelector } from "react-redux"
import { getClosedTicketsList, selectClosedTicketsList, selectClosedTicketsListError } from "./dashboardSlice"
import { getFormattedDateTimeGMT } from "../../utils/dates"

const DATE_FORMAT = "YYYY-MM-DD"

// The tab opens on (and Reset returns to) the last 7 days - same as the SCX
// dashboard's Closed Tickets tab.
function defaultRange() {
    return {
        startDate: moment().subtract(7, "days").format(DATE_FORMAT),
        endDate: moment().format(DATE_FORMAT),
    }
}

// The range boxes hold plain dates; the server is sent the viewer's own start of
// the first day and end of the last day, so "1 Sep" means 1 Sep where they are
// (the same clock the ticket details show the close time in).
function toRequest({ startDate, endDate }) {
    return {
        startDate: startDate ? moment(startDate, DATE_FORMAT).startOf("day").toISOString() : "",
        endDate: endDate ? moment(endDate, DATE_FORMAT).endOf("day").toISOString() : "",
    }
}

const columns = [
    "Ticket ID",
    "Customer Reference",
    "Problem Type",
    "Problem Start Date and Time (GMT)",
    "Ticket Close Date and Time (GMT)",
    "Closure Code",
]

// Problem Start is saved as text with no time zone, and comes in two shapes:
// "YYYY-MM-DDTHH:mm" (typed on Create Ticket) and a bare "YYYY-MM-DD" (bulk
// imports - no time of day was recorded). Both are shown in the same
// DD-MMM-YY style as the Closed Date, as entered rather than shifted; a
// date-only value shows just the date rather than inventing a time. Anything
// else (free text) is shown as-is.
const WALL_CLOCK = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
function formatProblemStart(value) {
    if (!value) return ""
    if (WALL_CLOCK.test(value)) return getFormattedDateTimeGMT(value)
    if (DATE_ONLY.test(value)) return moment.utc(value, "YYYY-MM-DD").format("DD-MMM-YY").toUpperCase()
    return value
}

const dateFieldSx = { "& .MuiInputBase-root, & .MuiInputLabel-root": { fontSize: "0.75rem" } }

// Customer Admin/User dashboard tab: the tickets closed within a chosen date
// range (the server limits it to the caller's own customer). A ticket SCX has
// since moved on to "Completed" is still closed, so it is listed here too.
export default function CustomerClosedTickets() {
    const dispatch = useDispatch()
    const list = useSelector(selectClosedTicketsList)
    const error = useSelector(selectClosedTicketsListError)

    const [startDate, setStartDate] = React.useState(() => defaultRange().startDate)
    const [endDate, setEndDate] = React.useState(() => defaultRange().endDate)
    const [loading, setLoading] = React.useState(true)
    // The range the list on screen was fetched for (the boxes can change before Apply).
    const [shownRange, setShownRange] = React.useState(() => defaultRange())

    const load = React.useCallback((range) => {
        setLoading(true)
        setShownRange(range)
        dispatch(getClosedTicketsList(toRequest(range))).then(() => setLoading(false))
    }, [dispatch])

    React.useEffect(() => {
        load(defaultRange())
    }, [load])

    const rangeInvalid = !!startDate && !!endDate && startDate > endDate

    const handleApply = () => load({ startDate, endDate })

    const handleReset = () => {
        const range = defaultRange()
        setStartDate(range.startDate)
        setEndDate(range.endDate)
        load(range)
    }

    const rows = _.get(list, "tickets", [])

    return (
        <Grid container spacing={1.5}>
            <Grid item xs={12}>
                <Typography component="h3" variant="subtitle1" sx={{ fontSize: "0.85rem", fontWeight: 600 }}>Filter By</Typography>
            </Grid>
            <Grid item xs={12}>
                <Paper sx={{ p: 1 }}>
                    <Grid container spacing={1} alignItems="center">
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="Start Date"
                                InputLabelProps={{ shrink: true }}
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                sx={dateFieldSx}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="End Date"
                                InputLabelProps={{ shrink: true }}
                                value={endDate}
                                onChange={(event) => setEndDate(event.target.value)}
                                error={rangeInvalid}
                                helperText={rangeInvalid ? "End Date must not be before Start Date" : ""}
                                sx={dateFieldSx}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4} sx={{ display: "flex", gap: 1 }}>
                            <Button size="small" variant="contained" onClick={handleApply} disabled={loading || rangeInvalid} sx={{ fontSize: "0.72rem" }}>
                                Apply
                            </Button>
                            <Button size="small" variant="text" onClick={handleReset} disabled={loading} sx={{ fontSize: "0.72rem" }}>Reset</Button>
                        </Grid>
                    </Grid>
                </Paper>
            </Grid>

            <Grid item xs={12}>
                {error ? (
                    <Alert severity="error">Unable to load closed tickets</Alert>
                ) : loading ? (
                    <Typography variant="body2" sx={{ fontSize: "0.72rem" }}>Loading...</Typography>
                ) : (
                    <>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.72rem", mb: 0.5 }}>
                            {rows.length} ticket{rows.length === 1 ? "" : "s"} closed from {shownRange.startDate} to {shownRange.endDate}
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
                            <Table size="small" stickyHeader sx={{ "& .MuiTableCell-root": { fontSize: "0.72rem", padding: "4px 8px" } }}>
                                <TableHead>
                                    <TableRow>
                                        {columns.map((label) => (
                                            <TableCell key={label} sx={{ fontWeight: 600 }}>{label}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={columns.length}>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
                                                    No tickets were closed in this date range
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {rows.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>{row.ticketId}</TableCell>
                                            <TableCell>{row.customerReference}</TableCell>
                                            <TableCell>{row.problemType}</TableCell>
                                            <TableCell>{formatProblemStart(row.problemStartDate)}</TableCell>
                                            <TableCell>{getFormattedDateTimeGMT(row.closedAt)}</TableCell>
                                            <TableCell>{row.closureCode}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </Grid>
        </Grid>
    )
}
