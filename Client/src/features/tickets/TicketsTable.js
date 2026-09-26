import * as React from "react"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import TextField from "@mui/material/TextField"
import InputAdornment from "@mui/material/InputAdornment"
import SearchIcon from "@mui/icons-material/Search"
import DeleteIcon from "@mui/icons-material/Delete"
import HistoryIcon from "@mui/icons-material/History"
import IconButton from "@mui/material/IconButton"
import Chip from "@mui/material/Chip"
import Snackbar from "@mui/material/Snackbar"

import PropTypes from "prop-types"

import {changeLimit, changePage, getClosedTickets, getCompletedTickets, selectGetTicketError, selectPageStatus, getOpenTickets, getOpenRfoTickets, selectClosedTicketList, selectCompletedTicketList, selectOpenTicketList, selectOpenRfoTicketList, selectSearch, setSearch, deactivateTicket, selectFocusTicketId, clearFocusTicket} from "./ticketSlice"
import { useSelector, useDispatch } from "react-redux"
import { Alert, Collapse, Typography} from "@mui/material"
import { pageStatusVals} from "./utils"
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material"

import _ from "lodash"
import moment from "moment"
import TicketDetails from "./TicketDetails"
import { getFormattedDateTimeGMT } from "../../utils/dates"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import ConfirmDialog from "../../components/ConfirmDialog"
import ActivityLogDialog from "./ActivityLogDialog"

const PRIORITY_COLORS = { High: "error", Medium: "info", Low: "default" }

// "Align to List Open Ticket font of Dashboard" - same fontSize/padding as
// the NOC/Admin Dashboard's own Open Tickets listing (see ScxDashboard.js's
// OpenTicketsTable), applied here to every list (View Open Ticket, View
// Closed Tickets, Completed Tickets, Deleted Tickets all share this table).
// MuiTypography-root is included since every cell's text is wrapped in a
// Typography (variant="h6" for headers, "body2" for rows) rather than being
// plain text like the Dashboard's own table.
const compactSx = {
    "& .MuiTableCell-root": { fontSize: "0.72rem", padding: "4px 8px" },
    "& .MuiTypography-root": { fontSize: "0.72rem" },
    "& .MuiChip-root": { height: 20, fontSize: "0.68rem" },
}

// The row's expand toggle - which is how a ticket is opened to edit it -
// lives in this rightmost Actions cell. With the extra vendor columns above
// the table can now run wider than the screen, which would otherwise
// scroll the expand/Activity Log/Delete icons out of view; pinning this
// column keeps "Edit ticket" reachable without hunting for a scrollbar.
const stickyActionsSx = {
    position: "sticky",
    right: 0,
    backgroundColor: "background.paper",
    zIndex: 1,
}

// Same vendor columns as the NOC/Admin Dashboard's own Open Tickets listing
// (see ScxDashboard.js) - Vendor Reference/Vendor Circuit ID/Vendor Name,
// replicated here so the Tickets module's own View Open Ticket / View
// Closed Ticket(s) tables show the same fields. Priority and Vendor Status
// are open-tickets-only now - not meaningful once a ticket is closed/
// completed, same reasoning as Days Pending. View Closed/Completed instead
// get Problem Start Date and Ticket Close Date after Created Date.
function buildColumns (mode) {
    // "View Open RFO ... show all Tickets with fields as shown in 'View
    // Open Ticket'" - same column set, whichever of the two modes this is.
    const isOpen = mode === "open" || mode === "openRfo"
    const columns = [
        { id: "ticketId", label: "Ticket ID" },
        { id: "customerReference", label: "Customer Reference" },
    ]
    if (isOpen) {
        columns.push({ id: "vendorTicketId", label: "Vendor Reference" })
    }
    columns.push(
        // Narrow, with word-wrap on the cell below - a long unbroken ID
        // would otherwise stretch the column (same fix as CircuitTable.js's
        // own Vendor Circuit ID column).
        { id: "vendorCircuitId", label: "Vendor Circuit ID", width: "8%" },
        { id: "vendorName", label: "Vendor Name" },
        { id: "problemType", label: "Problem Type" }
    )
    if (isOpen) {
        columns.push({ id: "priority", label: "Priority" })
    }
    columns.push(isOpen ? { id: "status", label: "Status" } : { id: "closureCode", label: "Closure Code" })
    if (isOpen) {
        columns.push({ id: "vendorTicketStatus", label: "Vendor Status" })
    }
    columns.push({ id: "createdDate", label: "Created Date (GMT)" })
    if (isOpen) {
        columns.push({ id: "daysPending", label: "Days Pending" })
    } else {
        columns.push(
            { id: "problemStartDateText", label: "Problem Start Date/Time (GMT)" },
            { id: "closedAtText", label: "Ticket Close Date/Time (GMT)" }
        )
    }
    // "NOC management: In View Open RFO / View Closed Tickets / Completed
    // Tickets list, add Column 'RFO Status' and 'RFO Code'" - not on plain
    // View Open Ticket, which is about tickets in general, not specifically
    // RFO tracking.
    if (mode === "openRfo" || mode === "closed" || mode === "completed") {
        columns.push(
            { id: "rfoStatus", label: "RFO Status" },
            { id: "rfoCode", label: "RFO Code" }
        )
    }
    return columns
}

// Problem Start Date is typed as a plain wall-clock string with no time
// zone (see TicketDetails.js's own WALL_CLOCK) - shown as entered rather
// than converted, unlike Created Date/Ticket Close Date, which are real UTC
// timestamps. Formatted with the same "DD-MMM-YY hh:mm a" pattern as
// getFormattedDateTimeGMT (Ticket Close Date's own formatter) so the two
// columns read consistently when a time is actually present. Some real
// tickets only ever got a bare date ("YYYY-MM-DD", no time) - those are
// formatted as just "DD-MMM-YY" rather than faking a "12:00 am" that was
// never entered. Bulk-imported tickets can hold something else entirely,
// so anything matching none of these shapes is shown as-is instead of
// blanked out.
function formatProblemStartDate(value) {
    if (!value) return ""
    const dateOnly = moment(value, "YYYY-MM-DD", true)
    if (dateOnly.isValid() && !value.includes("T")) {
        return dateOnly.format("DD-MMM-YY").toUpperCase()
    }
    const withTime = moment(value, ["YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DDTHH:mm"], true)
    return withTime.isValid() ? withTime.format("DD-MMM-YY hh:mm a").toUpperCase() : value
}

function createDisplayData (data) {
    return {
        ticketId: _.get(data, "ticketId", ""),
        customerReference: _.get(data, "customerReference", ""),
        vendorTicketId: _.get(data, "vendorTicketId", ""),
        vendorCircuitId: _.get(data, "vendorCircuitId", ""),
        vendorName: _.get(data, "vendor.name", ""),
        problemType: _.get(data, "problemType", ""),
        priority: _.get(data, "priority", ""),
        status: _.get(data, "status", ""),
        closureCode: _.get(data, "closureCode", ""),
        vendorTicketStatus: _.get(data, "vendorTicketStatus", ""),
        createdDate: getFormattedDateTimeGMT(_.get(data, "history[0].updatedAt", "")),
        problemStartDateText: formatProblemStartDate(_.get(data, "problemStartDate", "")),
        closedAtText: getFormattedDateTimeGMT(_.get(data, "closedAt", "")),
        daysPending: _.get(data, "createdAt") ? moment().diff(moment(data.createdAt), "days") : "",
        rfoStatus: _.get(data, "rfo.status", ""),
        rfoCode: _.get(data, "rfo.code", ""),
    }
}

export default function TicketsTable(props) {

    const status = useSelector(selectPageStatus)
    const errorMessage = useSelector(selectGetTicketError)
    const opneTicketList = useSelector(selectOpenTicketList)
    const closedTicketList = useSelector(selectClosedTicketList)
    const completedTicketList = useSelector(selectCompletedTicketList)
    const openRfoTicketList = useSelector(selectOpenRfoTicketList)
    const search = useSelector(selectSearch)
    const focusTicketId = useSelector(selectFocusTicketId)
    const currentUser = useSelector(selectUser)
    const canDelete = currentUser.role === roles.SCLOUDX_ADMIN
    // The Activity Log is for SCX only - customers never see it.
    const canViewLog = currentUser.role === roles.SCLOUDX_ADMIN || currentUser.role === roles.SCLOUDX_USER
    // "Also add Action Tab for SCX NOC and SCX Admin users" - on View Open
    // RFO specifically, only these two roles get the row-expand/Edit action
    // at all (every other role that can see this tab - Sales/Delivery/
    // Management - gets a read-only list, same idea as canDelete/canViewLog
    // above already being scoped narrower than "anyone who can see this
    // table").
    const canActOnOpenRfo = currentUser.role === roles.SCLOUDX_ADMIN || currentUser.role === roles.SCLOUDX_USER

    const pagination = props.pagination
    const mode = props.mode
    const columns = React.useMemo(() => buildColumns(mode), [mode])

    const [open, setOpen] = React.useState(false)
    const [searchInput, setSearchInput] = React.useState(search)
    const [ticketToDelete, setTicketToDelete] = React.useState(null)
    const [logTicket, setLogTicket] = React.useState(null)
    const [deleting, setDeleting] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)

    const dispatch = useDispatch()

    // Keeps the visible search box in sync with Redux `search` whenever it
    // changes from outside normal typing - focusTicket (a Ticket ID link)
    // seeding it, or Tickets.js's own reset-on-tab-click clearing it (see
    // "Same issue - Ticket ID → NOC", mirroring the same fix already
    // applied to Inventory's Circuit tabs and Sales Opportunities). Normal
    // typing already keeps the two in sync itself (the debounce effect
    // below dispatches setSearch once searchInput settles), so this is a
    // no-op then.
    React.useEffect(() => {
        setSearchInput(search)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search])

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await dispatch(deactivateTicket(ticketToDelete.id)).unwrap()
            setFeedback({ severity: "success", message: `Ticket "${ticketToDelete.ticketId}" deleted successfully` })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to delete ticket" })
        } finally {
            setDeleting(false)
            setTicketToDelete(null)
        }
    }

    const handleChangePage = (event, newPage) => {
        dispatch(changePage(newPage))
    }

    const handleChangeRowsPerPage = (event) => {
        dispatch(changeLimit(event.target.value))
    }

    const handleRowClick = (event, rowId) => {
        setOpen(open === rowId ? false : rowId)
    }

    function createDataRow (row) {
        const displayData = createDisplayData(row)

        return (
            <TableRow key={row.id} >
                {
                    columns.map((column) => (
                        <TableCell
                            key={`${row.id}${column.id}`}
                            sx={column.width ? { wordBreak: "break-word", overflowWrap: "anywhere" } : undefined}
                        >
                            {column.id === "priority" && displayData.priority ? (
                                <Chip size="small" label={displayData.priority} color={PRIORITY_COLORS[displayData.priority] || "default"} />
                            ) : (
                                <Typography variant="body2">{_.get(displayData, column.id, "")}
                                </Typography>
                            )}
                        </TableCell>
                    ))}
                <TableCell align="right" sx={stickyActionsSx}>
                    {(mode !== "openRfo" || canActOnOpenRfo) && (
                        <IconButton
                            aria-label={`${open === row.id ? "collapse" : "expand"} ${row.ticketId}`}
                            onClick={(event) => handleRowClick(event, row.id)}
                        >
                            {open === row.id ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                    )}
                    {canViewLog && (
                        <IconButton
                            aria-label={`activity log ${row.ticketId}`}
                            title="Activity Log"
                            onClick={() => setLogTicket(row)}
                        >
                            <HistoryIcon />
                        </IconButton>
                    )}
                    {canDelete && (
                        <IconButton
                            aria-label={`delete ${row.ticketId}`}
                            onClick={() => setTicketToDelete(row)}
                        >
                            <DeleteIcon />
                        </IconButton>
                    )}
                </TableCell>
            </TableRow>)


    }

    // Re-fetches whenever page, limit, or the committed search term changes.
    React.useEffect(() => {
        const data = {
            limit: pagination.limit,
            page: pagination.page + 1,
            search,
        }
        if (mode === "closed") {
            dispatch(getClosedTickets(data))
        } else if (mode === "completed") {
            dispatch(getCompletedTickets(data))
        } else if (mode === "openRfo") {
            dispatch(getOpenRfoTickets(data))
        } else {
            dispatch(getOpenTickets(data))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit, search, mode])

    // Arriving from another page for a specific ticket (see focusTicket):
    // open its details as soon as its row is in the list.
    React.useEffect(() => {
        if (!focusTicketId || mode !== "open") {
            return
        }
        const match = opneTicketList.find((ticket) => ticket.ticketId === focusTicketId)
        if (match) {
            setOpen(match.id)
            dispatch(clearFocusTicket())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opneTicketList, focusTicketId, mode])

    // Debounce the search box: only commit to Redux (and trigger the fetch
    // above) 400ms after the user stops typing.
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchInput !== search) {
                dispatch(setSearch(searchInput))
            }
        }, 400)
        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput])

    if (errorMessage) {
        return <Alert severity="error">{errorMessage}</Alert>
    } else if (status === pageStatusVals.loading) {
        return <div>loading</div>
    } else if (status === pageStatusVals.fetched) {
        const ticketList = mode === "closed" ? closedTicketList : mode === "completed" ? completedTicketList : mode === "openRfo" ? openRfoTicketList : opneTicketList
        return (
            <Paper sx={{ width: "100%", overflow: "hidden", p: 2 }}>
                {/* "All Logins - ... View Open tickets, View Closed Tickets,
                    Completed Tickets ... Display count at top" - mode-scoped
                    (each tab mounts its own TicketsTable and dispatches only
                    its own fetch - see the effect above - so pagination's
                    totalResults is never shared/stale across tabs here). */}
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Total Tickets: {pagination.totalResults}
                </Typography>
                <TextField
                    fullWidth
                    placeholder="Search by Ticket ID, Customer Reference, Problem Type, Status or Circuit Name"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    sx={{ mb: 2 }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
                <TableContainer sx={{ height: 1 }}>
                    <Table stickyHeader size="small" aria-label="sticky table" sx={compactSx}>
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        style={{ minWidth: column.minWidth, width: column.width }}
                                    >
                                        <Typography variant="h6">{column.label}
                                        </Typography>
                                    </TableCell>
                                ))}
                                <TableCell align="right" sx={{ ...stickyActionsSx, zIndex: 2 }}>
                                    <Typography variant="h6">Action/ Update</Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {ticketList.map((row) => (
                                <React.Fragment key={`${row.id}-div`}>
                                    {createDataRow(row)}
                                    <TableRow key={`${row.id}-collapse`} >
                                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={columns.length + 1}>
                                            <Collapse in = {open === row.id}>
                                                {open === row.id && <TicketDetails ticket={row} mode={mode} />}
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            ))}

                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={false}
                    component="div"
                    count={pagination.totalResults}
                    rowsPerPage={pagination.limit}
                    page={pagination.page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
                <ActivityLogDialog
                    open={!!logTicket}
                    ticket={logTicket}
                    onClose={() => setLogTicket(null)}
                />
                <ConfirmDialog
                    open={!!ticketToDelete}
                    title="Delete ticket"
                    message={`Are you sure you want to delete "${ticketToDelete && ticketToDelete.ticketId}"? This cannot be undone.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setTicketToDelete(null)}
                    loading={deleting}
                />
                <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                    {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
                </Snackbar>
            </Paper>
        )
    }
}

TicketsTable.propTypes = {
    pagination: PropTypes.object,
    mode: PropTypes.oneOf(["open", "closed", "completed", "openRfo"]),
}

TicketsTable.defaultProps = {
    mode: "open",
}
