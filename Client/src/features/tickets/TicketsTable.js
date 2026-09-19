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
import IconButton from "@mui/material/IconButton"
import Chip from "@mui/material/Chip"
import Snackbar from "@mui/material/Snackbar"

import PropTypes from "prop-types"

import {changeLimit, changePage, getClosedTickets, getCompletedTickets, selectGetTicketError, selectPageStatus, getOpenTickets, selectClosedTicketList, selectCompletedTicketList, selectOpenTicketList, selectSearch, setSearch, deactivateTicket, selectFocusTicketId, clearFocusTicket} from "./ticketSlice"
import { useSelector, useDispatch } from "react-redux"
import { Alert, Collapse, Typography} from "@mui/material"
import { pageStatusVals} from "./utils"
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material"

import _ from "lodash"
import TicketDetails from "./TicketDetails"
import { getFormattedDateTimeGMT } from "../../utils/dates"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import ConfirmDialog from "../../components/ConfirmDialog"

const PRIORITY_COLORS = { High: "error", Medium: "info", Low: "default" }

function buildColumns (mode) {
    return [
        { id: "ticketId", label: "Ticket ID" },
        { id: "customerReference", label: "Customer Reference" },
        { id: "problemType", label: "Problem Type" },
        { id: "priority", label: "Priority" },
        mode === "open" ? { id: "status", label: "Status" } : { id: "closureCode", label: "Closure Code" },
        { id: "createdBy", label: "Created By" },
        { id: "createdDate", label: "Created Date (GMT)" },
    ]
}

function createDisplayData (data) {
    return {
        ticketId: _.get(data, "ticketId", ""),
        customerReference: _.get(data, "customerReference", ""),
        problemType: _.get(data, "problemType", ""),
        priority: _.get(data, "priority", ""),
        status: _.get(data, "status", ""),
        closureCode: _.get(data, "closureCode", ""),
        createdBy: _.get(data, "history[0].user.email", ""),
        createdDate: getFormattedDateTimeGMT(_.get(data, "history[0].updatedAt", "")),
    }
}

export default function TicketsTable(props) {

    const status = useSelector(selectPageStatus)
    const errorMessage = useSelector(selectGetTicketError)
    const opneTicketList = useSelector(selectOpenTicketList)
    const closedTicketList = useSelector(selectClosedTicketList)
    const completedTicketList = useSelector(selectCompletedTicketList)
    const search = useSelector(selectSearch)
    const focusTicketId = useSelector(selectFocusTicketId)
    const currentUser = useSelector(selectUser)
    const canDelete = currentUser.role === roles.SCLOUDX_ADMIN

    const pagination = props.pagination
    const mode = props.mode
    const columns = React.useMemo(() => buildColumns(mode), [mode])

    const [open, setOpen] = React.useState(false)
    const [searchInput, setSearchInput] = React.useState(search)
    const [ticketToDelete, setTicketToDelete] = React.useState(null)
    const [deleting, setDeleting] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)

    const dispatch = useDispatch()

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
                        >
                            {column.id === "priority" && displayData.priority ? (
                                <Chip size="small" label={displayData.priority} color={PRIORITY_COLORS[displayData.priority] || "default"} />
                            ) : (
                                <Typography variant="body2">{_.get(displayData, column.id, "")}
                                </Typography>
                            )}
                        </TableCell>
                    ))}
                <TableCell align="right">
                    {canDelete && (
                        <IconButton
                            aria-label={`delete ${row.ticketId}`}
                            onClick={() => setTicketToDelete(row)}
                        >
                            <DeleteIcon />
                        </IconButton>
                    )}
                    <IconButton onClick={(event) => handleRowClick(event, row.id)}
                    >
                        {open === row.id ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
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
        const ticketList = mode === "closed" ? closedTicketList : mode === "completed" ? completedTicketList : opneTicketList
        return (
            <Paper sx={{ width: "100%", overflow: "hidden", p: 2 }}>
                <TextField
                    fullWidth
                    placeholder="Search Ticket"
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
                    <Table stickyHeader aria-label="sticky table">
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        style={{ minWidth: column.minWidth }}
                                    >
                                        <Typography variant="h6">{column.label}
                                        </Typography>
                                    </TableCell>
                                ))}
                                <TableCell align="right">
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
    mode: PropTypes.oneOf(["open", "closed", "completed"]),
}

TicketsTable.defaultProps = {
    mode: "open",
}
