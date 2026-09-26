import * as React from "react"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import IconButton from "@mui/material/IconButton"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove"
import Snackbar from "@mui/material/Snackbar"
import { Alert, Typography } from "@mui/material"

import PropTypes from "prop-types"
import _ from "lodash"
import { useSelector, useDispatch } from "react-redux"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { updateCircuit, updateCircuitStatus, deactivateCircuit } from "./circuitSlice"
import { getSites, selectPagination } from "./inventorySlice"
import { selectVendorList } from "../vendors/vendorSlice"
import ConfirmDialog from "../../components/ConfirmDialog"
import EditDialog from "../../components/EditDialog"
import MoveCircuitDialog from "./MoveCircuitDialog"
import { getFormattedDateTime, getFormattedStoredDate as reformatStoredDate } from "../../utils/dates"
import { useCircuitRowPermissions, buildEditableFields, buildStatusEditableFields, STATUS_FIELD_NAMES } from "./circuitActions"

// "Every Circuit Should have following status ... Live since (Bill Start
// date) / Ceased (Capture Bill Stop date) / Changed (Captured Change -
// Type, Change Order Number and Change Date)" - Live reuses
// customerCircuitBillStartDate rather than a field of its own.
function formatCircuitStatus(row) {
    const status = row.status || "Live"
    if (status === "Ceased") {
        return row.billStopDate ? `Ceased ${reformatStoredDate(row.billStopDate)}` : "Ceased"
    }
    if (status === "Changed") {
        const parts = [row.changeType, row.changeOrderNumber, row.changeDate ? reformatStoredDate(row.changeDate) : ""].filter(Boolean)
        return parts.length ? `Changed (${parts.join(" - ")})` : "Changed"
    }
    return row.customerCircuitBillStartDate ? `Live since ${reformatStoredDate(row.customerCircuitBillStartDate)}` : "Live"
}

// customerVisible controls which columns Customer Admin/Customer User can
// see - everyone else (SCX roles) sees every column.
const columns = [
    { id: "vendorName", label: "Vendor Name", customerVisible: false, format: (row, vendorNameById) => vendorNameById.get(row.vendorId) || "" },
    // Not customerVisible - it surfaces customerCircuitBillStartDate (Live)
    // and other operational detail, and that underlying field itself is
    // already hidden from customers below.
    { id: "status", label: "Circuit Status", customerVisible: false, format: (row) => formatCircuitStatus(row) },
    // Narrow, with word-wrap on the cell below - a long unbroken ID would
    // otherwise stretch the column and push everything else out (same fix
    // as FinanceDashboard.js's own Vendor Circuit ID column).
    { id: "vendorCircuitId", label: "Vendor Circuit Id", customerVisible: false, width: "7%" },
    { id: "customerCircuitId", label: "Customer Circuit Id", customerVisible: true, width: "7%" },
    { id: "scloudxOrderReference", label: "Scloudx Order Ref", customerVisible: true },
    { id: "vendorOrderReference", label: "Vendor Order Ref", customerVisible: false },
    { id: "customerOrderReference", label: "Customer Order Ref", customerVisible: true },
    { id: "customerCircuitBillStartDate", label: "Customer Bill Start Date", customerVisible: false, format: (row) => reformatStoredDate(row.customerCircuitBillStartDate) },
    { id: "customerCircuitContractTerm", label: "Customer Contract Term", customerVisible: false },
    { id: "vendorCircuitBillStartDate", label: "Vendor Bill Start Date", customerVisible: false, format: (row) => reformatStoredDate(row.vendorCircuitBillStartDate) },
    { id: "vendorCircuitContractTerm", label: "Vendor Contract Term", customerVisible: false },
    { id: "vendorLECName", label: "Vendor LEC Name", customerVisible: false },
    { id: "bandwidth", label: "Bandwidth", customerVisible: true },
    { id: "product", label: "Product", customerVisible: true },
    { id: "vendorUptime", label: "Vendor Uptime", customerVisible: false },
    { id: "vendorMTTR", label: "Vendor MTTR", customerVisible: false },
]

export default function CircuitTable(props) {
    const dispatch = useDispatch()
    const currentUser = useSelector(selectUser)
    const { isAdmin, canMove, canEditStatusForRow } = useCircuitRowPermissions()
    const isCustomerRole = currentUser.role === roles.CUSTOMER_ADMIN || currentUser.role === roles.CUSTOMER_USER
    const pagination = useSelector(selectPagination)
    const vendorList = useSelector(selectVendorList)

    const visibleColumns = isCustomerRole ? columns.filter((column) => column.customerVisible) : columns
    const vendorNameById = React.useMemo(() => new Map(vendorList.map((vendor) => [vendor.id, vendor.name])), [vendorList])

    const [circuitToDelete, setCircuitToDelete] = React.useState(null)
    const [deleting, setDeleting] = React.useState(false)
    const [circuitToEdit, setCircuitToEdit] = React.useState(null)
    const [circuitToEditStatus, setCircuitToEditStatus] = React.useState(null)
    const [circuitToMove, setCircuitToMove] = React.useState(null)
    const [saving, setSaving] = React.useState(false)
    const [savingStatus, setSavingStatus] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)

    const refreshInventory = () => {
        dispatch(getSites({ limit: pagination.limit, page: pagination.page + 1 }))
    }

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await dispatch(deactivateCircuit(circuitToDelete.id)).unwrap()
            setFeedback({ severity: "success", message: `Circuit "${circuitToDelete.vendorCircuitId || circuitToDelete.code}" deleted successfully` })
            refreshInventory()
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to delete circuit" })
        } finally {
            setDeleting(false)
            setCircuitToDelete(null)
        }
    }

    // Called when the "Circuit moved" confirmation in the dialog is closed -
    // the dialog itself shows the success message, so just refresh the list.
    const handleMoved = () => {
        setCircuitToMove(null)
        refreshInventory()
    }

    const handleSaveEdit = async (values) => {
        setSaving(true)
        try {
            await dispatch(updateCircuit({ circuitId: circuitToEdit.id, ...values })).unwrap()
            setFeedback({ severity: "success", message: "Circuit updated successfully" })
            setCircuitToEdit(null)
            refreshInventory()
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update circuit" })
        } finally {
            setSaving(false)
        }
    }

    const handleSaveStatusEdit = async (values) => {
        setSavingStatus(true)
        try {
            await dispatch(updateCircuitStatus({ circuitId: circuitToEditStatus.id, ..._.pick(values, STATUS_FIELD_NAMES) })).unwrap()
            setFeedback({ severity: "success", message: "Circuit status updated successfully" })
            setCircuitToEditStatus(null)
            refreshInventory()
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update circuit status" })
        } finally {
            setSavingStatus(false)
        }
    }

    function createDataRow (row) {
        return (<TableRow key={row.id} >
            {
                visibleColumns.map((column) => (
                    <TableCell
                        key={`${row.id}${column.id}`}
                        sx={column.width ? { wordBreak: "break-word", overflowWrap: "anywhere" } : undefined}
                    >
                        <Typography variant="body2">{column.format ? column.format(row, vendorNameById) : _.get(row, column.id, "")}
                        </Typography>
                    </TableCell>
                ))}
            <TableCell align="right">
                {isAdmin && (
                    <IconButton
                        aria-label={`edit ${row.vendorCircuitId || row.code}`}
                        onClick={() => setCircuitToEdit(row)}
                    >
                        <EditIcon />
                    </IconButton>
                )}
                {canEditStatusForRow(row) && (
                    <IconButton
                        aria-label={`edit status ${row.vendorCircuitId || row.code}`}
                        title="Change Circuit Status"
                        onClick={() => setCircuitToEditStatus(row)}
                    >
                        <SwapHorizIcon />
                    </IconButton>
                )}
                {canMove && (
                    <IconButton
                        aria-label={`move ${row.vendorCircuitId || row.code}`}
                        title="Move to another site"
                        onClick={() => setCircuitToMove(row)}
                    >
                        <DriveFileMoveIcon />
                    </IconButton>
                )}
                {isAdmin && (
                    <IconButton
                        aria-label={`delete ${row.vendorCircuitId || row.code}`}
                        onClick={() => setCircuitToDelete(row)}
                    >
                        <DeleteIcon />
                    </IconButton>
                )}
            </TableCell>
        </TableRow>)
    }

    return (
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
            <TableContainer sx={{ height: 1 }}>
                <Table stickyHeader aria-label="sticky table" size="small">
                    <TableHead>
                        <TableRow>
                            {visibleColumns.map((column) => (
                                <TableCell
                                    key={column.id}
                                    style={{ minWidth: column.minWidth, width: column.width }}
                                >
                                    <Typography variant="h5">{column.label}
                                    </Typography>
                                </TableCell>
                            ))}
                            <TableCell align="right">
                                <Typography variant="h5">Actions</Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {props.circuitList.map((row) => (
                            <React.Fragment key={`${row.code}-div`}>
                                {createDataRow(row)}
                            </React.Fragment>
                        ))}

                    </TableBody>
                </Table>
            </TableContainer>
            <ConfirmDialog
                open={!!circuitToDelete}
                title="Delete circuit"
                message={`Are you sure you want to delete circuit "${circuitToDelete && (circuitToDelete.vendorCircuitId || circuitToDelete.code)}"? This cannot be undone.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setCircuitToDelete(null)}
                loading={deleting}
            />
            <EditDialog
                open={!!circuitToEdit}
                title="Edit circuit"
                fields={buildEditableFields(circuitToEdit)}
                initialValues={circuitToEdit ? _.pick(circuitToEdit, buildEditableFields(circuitToEdit).map((field) => field.name)) : {}}
                lastEditedNote={
                    circuitToEdit && circuitToEdit.updatedBy && circuitToEdit.updatedBy.name
                        ? `Last edited by ${circuitToEdit.updatedBy.name} on ${getFormattedDateTime(circuitToEdit.updatedAt)}`
                        : null
                }
                onSave={handleSaveEdit}
                onCancel={() => setCircuitToEdit(null)}
                loading={saving}
            />
            <EditDialog
                open={!!circuitToEditStatus}
                title="Change Circuit Status"
                dense
                fields={(values) => buildStatusEditableFields(values, isAdmin)}
                initialValues={
                    circuitToEditStatus
                        ? {
                            status: circuitToEditStatus.status || "Live",
                            billStopDate: circuitToEditStatus.billStopDate || "",
                            changeType: circuitToEditStatus.changeType || "",
                            changeOrderNumber: circuitToEditStatus.changeOrderNumber || "",
                            changeDate: circuitToEditStatus.changeDate || "",
                            product: circuitToEditStatus.product || "",
                            bandwidth: circuitToEditStatus.bandwidth || "",
                        }
                        : {}
                }
                onSave={handleSaveStatusEdit}
                onCancel={() => setCircuitToEditStatus(null)}
                loading={savingStatus}
            />
            <MoveCircuitDialog
                open={!!circuitToMove}
                circuit={circuitToMove}
                site={props.site}
                onClose={() => setCircuitToMove(null)}
                onMoved={handleMoved}
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

CircuitTable.propTypes = {
    circuitList: PropTypes.array,
    site: PropTypes.object
}
