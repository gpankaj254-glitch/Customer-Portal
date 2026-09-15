import * as React from "react"
import _ from "lodash"
import moment from "moment"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import Checkbox from "@mui/material/Checkbox"
import Toolbar from "@mui/material/Toolbar"
import Button from "@mui/material/Button"
import Snackbar from "@mui/material/Snackbar"
import PropTypes from "prop-types"
import ConfirmDialog from "./ConfirmDialog"

// Read-only view of soft-deleted records, with an optional bulk restore
// action. Fetches directly rather than going through Redux, since this is a
// simple admin-only view with no other state to share - identityRejectValue
// makes the shared fetch*/restore* API functions return the plain error
// string instead of a real rejectWithValue() action wrapper.
const identityRejectValue = (payload) => payload

export default function DeletedRecordsPanel({ columns, fetchDeleted, restoreRecord, permanentlyDeleteRecord, entityLabel }) {
    const [list, setList] = React.useState([])
    const [pagination, setPagination] = React.useState({ page: 0, limit: 20, totalResults: 0 })
    const [errorMessage, setErrorMessage] = React.useState(null)
    const [selected, setSelected] = React.useState([])
    const [confirmOpen, setConfirmOpen] = React.useState(false)
    const [restoring, setRestoring] = React.useState(false)
    const [hardDeleteConfirmOpen, setHardDeleteConfirmOpen] = React.useState(false)
    const [hardDeleting, setHardDeleting] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)

    const load = (page, limit) => {
        fetchDeleted({ limit, page: page + 1 }, identityRejectValue).then((result) => {
            if (result && result.results) {
                setList(result.results)
                setPagination({ page, limit, totalResults: result.totalResults })
                setErrorMessage(null)
                setSelected([])
            } else {
                setErrorMessage(typeof result === "string" ? result : "Failed to load deleted records")
            }
        })
    }

    React.useEffect(() => {
        load(0, pagination.limit)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleChangePage = (event, newPage) => {
        load(newPage, pagination.limit)
    }

    const handleChangeRowsPerPage = (event) => {
        load(0, event.target.value)
    }

    const toggleSelected = (id) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]))
    }

    const toggleSelectAll = (event) => {
        setSelected(event.target.checked ? list.map((row) => row.id) : [])
    }

    const hasSelectionCheckbox = !!(restoreRecord || permanentlyDeleteRecord)

    const handleConfirmRestore = async () => {
        setRestoring(true)
        const results = await Promise.allSettled(
            selected.map((id) => restoreRecord(id, (err) => { throw new Error(err) }))
        )
        const succeeded = results.filter((result) => result.status === "fulfilled").length
        const failed = results.length - succeeded
        if (failed === 0) {
            setFeedback({ severity: "success", message: `Restored ${succeeded} ${entityLabel}${succeeded === 1 ? "" : "s"}` })
        } else {
            setFeedback({ severity: "error", message: `Restored ${succeeded}, failed ${failed} - a failed record's customer may still be deleted` })
        }
        setRestoring(false)
        setConfirmOpen(false)
        load(pagination.page, pagination.limit)
    }

    const handleConfirmHardDelete = async () => {
        setHardDeleting(true)
        const results = await Promise.allSettled(
            selected.map((id) => permanentlyDeleteRecord(id, (err) => { throw new Error(err) }))
        )
        const succeeded = results.filter((result) => result.status === "fulfilled").length
        const failed = results.length - succeeded
        if (failed === 0) {
            setFeedback({ severity: "success", message: `Permanently deleted ${succeeded} ${entityLabel}${succeeded === 1 ? "" : "s"}` })
        } else {
            setFeedback({ severity: "error", message: `Permanently deleted ${succeeded}, failed ${failed}` })
        }
        setHardDeleting(false)
        setHardDeleteConfirmOpen(false)
        load(pagination.page, pagination.limit)
    }

    const allColumns = [
        ...columns,
        { id: "deletedAt", label: "Deleted At", format: (value) => (value ? moment(value).format("MMM D, YYYY h:mm A") : "") },
        { id: "deletedBy.name", label: "Deleted By" },
    ]

    if (errorMessage) {
        return <Alert severity="error">{errorMessage}</Alert>
    }

    const allSelected = list.length > 0 && selected.length === list.length

    return (
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
            {hasSelectionCheckbox && selected.length > 0 && (
                <Toolbar sx={{ pl: 2 }}>
                    <Typography sx={{ flex: "1 1 100%" }} variant="subtitle1">
                        {selected.length} selected
                    </Typography>
                    {restoreRecord && (
                        <Button variant="contained" onClick={() => setConfirmOpen(true)} sx={{ mr: permanentlyDeleteRecord ? 1 : 0 }}>
                            Restore Selected
                        </Button>
                    )}
                    {permanentlyDeleteRecord && (
                        <Button variant="outlined" color="error" onClick={() => setHardDeleteConfirmOpen(true)}>
                            Delete Permanently
                        </Button>
                    )}
                </Toolbar>
            )}
            <TableContainer sx={{ maxHeight: 440 }}>
                <Table stickyHeader aria-label="deleted records table">
                    <TableHead>
                        <TableRow>
                            {hasSelectionCheckbox && (
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={allSelected}
                                        indeterminate={selected.length > 0 && !allSelected}
                                        onChange={toggleSelectAll}
                                    />
                                </TableCell>
                            )}
                            {allColumns.map((column) => (
                                <TableCell key={column.id}>
                                    <Typography variant="h6">{column.label}</Typography>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {list.map((row) => (
                            <TableRow key={row.id} selected={selected.includes(row.id)}>
                                {hasSelectionCheckbox && (
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selected.includes(row.id)}
                                            onChange={() => toggleSelected(row.id)}
                                        />
                                    </TableCell>
                                )}
                                {allColumns.map((column) => (
                                    <TableCell key={`${row.id}${column.id}`}>
                                        <Typography variant="body2">
                                            {column.format ? column.format(_.get(row, column.id)) : _.get(row, column.id, "")}
                                        </Typography>
                                    </TableCell>
                                ))}
                            </TableRow>
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
                open={confirmOpen}
                title={`Restore ${entityLabel}s`}
                message={`Restore ${selected.length} selected ${entityLabel}${selected.length === 1 ? "" : "s"}?`}
                confirmLabel="Restore"
                onConfirm={handleConfirmRestore}
                onCancel={() => setConfirmOpen(false)}
                loading={restoring}
            />
            <ConfirmDialog
                open={hardDeleteConfirmOpen}
                title={`Permanently delete ${entityLabel}s`}
                message={`Permanently delete ${selected.length} selected ${entityLabel}${selected.length === 1 ? "" : "s"}? This removes them from the database entirely and cannot be undone.`}
                confirmLabel="Delete Permanently"
                onConfirm={handleConfirmHardDelete}
                onCancel={() => setHardDeleteConfirmOpen(false)}
                loading={hardDeleting}
            />
            <Snackbar
                open={!!feedback}
                autoHideDuration={4000}
                onClose={() => setFeedback(null)}
            >
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Paper>
    )
}

DeletedRecordsPanel.propTypes = {
    columns: PropTypes.array.isRequired,
    fetchDeleted: PropTypes.func.isRequired,
    restoreRecord: PropTypes.func,
    permanentlyDeleteRecord: PropTypes.func,
    entityLabel: PropTypes.string,
}

DeletedRecordsPanel.defaultProps = {
    restoreRecord: null,
    permanentlyDeleteRecord: null,
    entityLabel: "record",
}
