import * as React from "react"
import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Link from "@mui/material/Link"
import Alert from "@mui/material/Alert"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove"
import DownloadIcon from "@mui/icons-material/Download"
import Snackbar from "@mui/material/Snackbar"
import PropTypes from "prop-types"
import _ from "lodash"
import moment from "moment"
import { useDispatch, useSelector } from "react-redux"
import {
    getCircuitsList,
    selectCircuitsList,
    selectCircuitsListStatus,
    selectCircuitsListError,
    updateCircuit,
    updateCircuitStatus,
    deactivateCircuit,
} from "./circuitSlice"
import { getVendors, selectVendorList } from "../vendors/vendorSlice"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { pageStatusVals } from "./utils"
import { formatTownCountry } from "../../utils/address"
import { getFormattedStoredDate, getFormattedDateTime } from "../../utils/dates"
import { downloadCsv } from "../../utils/csv"
import { getCircuitStatusDate, getCircuitChangeTypeDisplay, circuitCsvColumns } from "../../utils/circuitDisplay"
import ConfirmDialog from "../../components/ConfirmDialog"
import EditDialog from "../../components/EditDialog"
import MoveCircuitDialog from "./MoveCircuitDialog"
import { useCircuitRowPermissions, buildEditableFields, buildStatusEditableFields, STATUS_FIELD_NAMES } from "./circuitActions"

// "if I put 100 Mbps+USA+Verizon) it should filter all circuits with 100
// Mbps BW in USA country and Verizon Vendor" - each "+"-separated term must
// match something in the row (any field), and every term must match -
// mirrors ScxDashboard's own matchesOpenTicketSearch, extended to several
// AND'ed terms instead of just one.
function matchesMultiTermSearch(row, rawSearch) {
    const terms = rawSearch.split("+").map((term) => term.trim().toLowerCase()).filter(Boolean)
    if (terms.length === 0) {
        return true
    }
    const haystacks = [
        row.customerName,
        row.scloudxOrderReference,
        row.customerOrderReference,
        row.product,
        row.bandwidth,
        row.vendorName,
        row.endUser,
        row.siteName,
        row.townCountry,
        row.status,
        row.changeTypeDisplay,
        row.statusDateDisplay,
    ].map((value) => String(value || "").toLowerCase())
    return terms.every((term) => haystacks.some((haystack) => haystack.includes(term)))
}

// "Create New Tab - Live Circuit Inventory - for only those with status
// LIVE" / "Create Another Tab - Ceased Circuit Inventory" - a circuit-
// centric view (one row per circuit, across every site) rather than the
// rest of Inventory's site-centric tables. Shared by both new tabs, just
// parameterized by which statuses to include and whether Change Type is
// shown (only meaningful once a circuit has actually Changed).
// initialSearch/onOpenChangeOrder are the two ends of "Make 'Change Order
// Number' Clickable and ... it should display Information from Live Circuit
// Inventory for that Change Order Number" (see Inventory.js): the Live tab
// takes initialSearch (seeded from the clicked value - a Change Order
// Number is itself an SCX Order Ref Number on the new circuit it refers to,
// so the existing search already finds it via scloudxOrderReference), the
// Ceased tab takes onOpenChangeOrder (called with that value on click).
//
// "All Actions Available in Live Site Inventory - Circuits should also be
// available to Live Circuit Inventory according to that User Access List" /
// "All Actions Available in Changed & Ceased Site Inventory - Circuits
// should also be available to Ceased Circuit Inventory according to that
// User Access List" - Edit/Edit Status/Move/Delete, same icons, same
// dialogs, same role gating as CircuitTable.js (Site Inventory's own
// per-site circuit table) - see circuitActions.js, shared by both so they
// can never drift apart.
export default function CircuitInventoryTable({ statuses, showChangeType, initialSearch, onOpenChangeOrder, canDownloadCsv }) {
    const dispatch = useDispatch()
    const circuits = useSelector(selectCircuitsList)
    const status = useSelector(selectCircuitsListStatus)
    const error = useSelector(selectCircuitsListError)
    const vendorList = useSelector(selectVendorList)
    const currentUser = useSelector(selectUser)
    // "Customer Login - Live inventory list, replace Vendor Name with End
    // User name" - Circuit Inventory is the only Inventory list a Customer
    // still sees at all (Site Inventory is SCX Admin only - see Inventory.js).
    const isCustomer = currentUser.role === roles.CUSTOMER_ADMIN || currentUser.role === roles.CUSTOMER_USER
    const { isAdmin, canMove, canEditStatusForRow } = useCircuitRowPermissions()
    const [searchInput, setSearchInput] = React.useState(initialSearch)

    const [circuitToDelete, setCircuitToDelete] = React.useState(null)
    const [deleting, setDeleting] = React.useState(false)
    const [circuitToEdit, setCircuitToEdit] = React.useState(null)
    const [circuitToEditStatus, setCircuitToEditStatus] = React.useState(null)
    const [circuitToMove, setCircuitToMove] = React.useState(null)
    const [saving, setSaving] = React.useState(false)
    const [savingStatus, setSavingStatus] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)

    React.useEffect(() => {
        dispatch(getVendors({ limit: 1000, page: 1 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const statusKey = statuses.join(",")
    const refreshCircuits = () => dispatch(getCircuitsList({ statuses }))
    React.useEffect(() => {
        refreshCircuits()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusKey])

    // Tab switches reuse this same component instance (same type/position in
    // Inventory.js's tree, just different props) rather than remounting it,
    // so the initial-value form of useState above only takes effect the
    // very first time this tab is ever shown - this effect is what actually
    // re-seeds the search box on every later click too.
    React.useEffect(() => {
        if (initialSearch) {
            setSearchInput(initialSearch)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSearch])

    const vendorNameById = React.useMemo(
        () => new Map(vendorList.map((vendor) => [vendor.id, vendor.name])),
        [vendorList]
    )

    // Spreads every raw circuit field first (id, site, customer, vendorId,
    // code, vendorCircuitId, customerCircuitId, ... - everything the Actions
    // below need, same shape CircuitTable.js's own rows carry) and layers
    // the display-only fields on top - no name collisions between the two.
    const rows = React.useMemo(() => circuits.map((circuit) => ({
        ...circuit,
        customerName: _.get(circuit, "customer.name", ""),
        scloudxOrderReference: circuit.scloudxOrderReference || "",
        customerOrderReference: circuit.customerOrderReference || "",
        product: circuit.product || "",
        bandwidth: circuit.bandwidth || "",
        vendorName: vendorNameById.get(circuit.vendorId) || "",
        endUser: circuit.endUser || "",
        siteName: _.get(circuit, "site.name", ""),
        townCountry: formatTownCountry(circuit.location || {}),
        location: circuit.location,
        status: circuit.status || "Live",
        changeType: circuit.changeType || "",
        changeOrderNumber: circuit.changeOrderNumber || "",
        changeTypeDisplay: getCircuitChangeTypeDisplay(circuit),
        statusDateDisplay: getFormattedStoredDate(getCircuitStatusDate(circuit)),
        // "Live Circuit Inventory, Sort by Circuit status date decending
        // order" - Circuit Status Date is stored "DD-MM-YYYY" (see
        // circuit.service.js's BILL_START_DATE_FORMAT), so it has to be
        // parsed before sorting - sorting the raw strings would order
        // "05-12-2023" before "20-01-2024" (day-first, not year-first).
        // Invalid/blank dates sort last either way.
        statusDateValue: (() => {
            const parsed = moment(getCircuitStatusDate(circuit), "DD-MM-YYYY", true)
            return parsed.isValid() ? parsed.valueOf() : -1
        })(),
    })), [circuits, vendorNameById])

    const searchTerm = searchInput.trim().toLowerCase()
    const filteredRows = React.useMemo(
        () => rows
            .filter((row) => matchesMultiTermSearch(row, searchTerm))
            .sort((a, b) => b.statusDateValue - a.statusDateValue),
        [rows, searchTerm]
    )

    // "Download Circuit Inventory Option - CSV in all Tabs" - exports
    // exactly what's currently on screen (search applied), same columns as
    // the table below (changeType/statusDate map to this row shape's own
    // changeTypeDisplay/statusDateDisplay field names; address - still
    // labelled "Address" here since circuitCsvColumns is shared with Site
    // Inventory's own full-address CSV - now pulls from this row's
    // townCountry, matching "Remove Address, Just add Town/City+Country").
    const csvFieldByColumnId = { changeType: "changeTypeDisplay", statusDate: "statusDateDisplay", address: "townCountry" }
    const handleDownloadCsv = () => {
        const csvColumns = circuitCsvColumns(showChangeType)
        const headers = csvColumns.map((column) => column.label)
        const csvRows = filteredRows.map((row) => csvColumns.map((column) => row[csvFieldByColumnId[column.id] || column.id]))
        downloadCsv(`circuit-inventory-${moment().format("YYYY-MM-DD")}.csv`, headers, csvRows)
    }

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await dispatch(deactivateCircuit(circuitToDelete.id)).unwrap()
            setFeedback({ severity: "success", message: `Circuit "${circuitToDelete.vendorCircuitId || circuitToDelete.code}" deleted successfully` })
            refreshCircuits()
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
        refreshCircuits()
    }

    const handleSaveEdit = async (values) => {
        setSaving(true)
        try {
            await dispatch(updateCircuit({ circuitId: circuitToEdit.id, ...values })).unwrap()
            setFeedback({ severity: "success", message: "Circuit updated successfully" })
            setCircuitToEdit(null)
            refreshCircuits()
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
            refreshCircuits()
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update circuit status" })
        } finally {
            setSavingStatus(false)
        }
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>
    }

    const columnCount = showChangeType ? 11 : 10

    return (
        <Paper sx={{ width: "100%", overflow: "hidden", p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                {/* "Also Display Number if rows total/ filtered as 'Number
                    of Circuits' at top" - counts whatever's currently
                    shown, so it narrows along with the search below. */}
                <Typography variant="subtitle1">
                    Number of Circuits: {filteredRows.length}
                </Typography>
                {/* "Give CSV Download options for Inventory ... only to SCX
                    Admin User" */}
                {canDownloadCsv && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownloadCsv}
                        disabled={filteredRows.length === 0}
                    >
                        Download CSV
                    </Button>
                )}
            </Box>
            <TextField
                fullWidth
                label="Search"
                placeholder='Combine multiple fields with "+", e.g. 100 Mbps+USA+Verizon'
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                sx={{ mb: 2 }}
            />
            {/* "Admin Login, reduce row width of Circuit Inventory - Live and
                Ceased" - same compact cell density (font size + padding)
                already used by most other tables in the app (Delivery Order
                table, Open Tickets table, etc.) - this one previously had no
                override at all, so its rows were noticeably taller/wider. */}
            <TableContainer sx={{ maxHeight: 520 }}>
                <Table stickyHeader size="small" sx={{ "& .MuiTableCell-root": { fontSize: "0.75rem", padding: "4px 8px" } }}>
                    <TableHead>
                        <TableRow>
                            <TableCell><Typography variant="subtitle2">Customer Name</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">SCX Order Ref Number</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">Customer PO Number</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">Product</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">Bandwidth</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">{isCustomer ? "End User Name" : "Vendor Name"}</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">Town/City + Country</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">Circuit Status</Typography></TableCell>
                            {showChangeType && (
                                <TableCell><Typography variant="subtitle2">Change Type</Typography></TableCell>
                            )}
                            <TableCell><Typography variant="subtitle2">Circuit Status Date</Typography></TableCell>
                            <TableCell align="right"><Typography variant="subtitle2">Actions</Typography></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {status === pageStatusVals.loading && (
                            <TableRow>
                                <TableCell colSpan={columnCount}>
                                    <Typography variant="body2" color="text.secondary">Loading...</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {status === pageStatusVals.fetched && filteredRows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={columnCount}>
                                    <Typography variant="body2" color="text.secondary">No circuits found</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredRows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.customerName}</TableCell>
                                <TableCell>{row.scloudxOrderReference}</TableCell>
                                <TableCell>{row.customerOrderReference}</TableCell>
                                <TableCell>{row.product}</TableCell>
                                <TableCell>{row.bandwidth}</TableCell>
                                <TableCell>{isCustomer ? row.endUser : row.vendorName}</TableCell>
                                <TableCell sx={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{row.townCountry}</TableCell>
                                <TableCell>{row.status}</TableCell>
                                {showChangeType && (
                                    <TableCell sx={{ wordBreak: "break-word" }}>
                                        {row.status === "Ceased" ? (
                                            "Customer Cease"
                                        ) : row.status === "Changed" ? (
                                            <>
                                                {row.changeType}
                                                {row.changeType && row.changeOrderNumber ? " - " : ""}
                                                {row.changeOrderNumber ? (
                                                    <Link
                                                        component="button"
                                                        type="button"
                                                        underline="hover"
                                                        onClick={() => onOpenChangeOrder && onOpenChangeOrder(row.changeOrderNumber)}
                                                        // A native <button> (component="button") isn't
                                                        // display:inline by default, so it was dropping to
                                                        // its own line instead of flowing after "Upgrade - "
                                                        // like normal text - this makes it behave like
                                                        // inline text instead, and strips the button's own
                                                        // chrome (border/background/padding).
                                                        sx={{
                                                            fontSize: "inherit",
                                                            fontFamily: "inherit",
                                                            verticalAlign: "baseline",
                                                            display: "inline",
                                                            p: 0,
                                                            border: 0,
                                                            background: "none",
                                                        }}
                                                    >
                                                        {row.changeOrderNumber}
                                                    </Link>
                                                ) : null}
                                            </>
                                        ) : null}
                                    </TableCell>
                                )}
                                <TableCell>{row.statusDateDisplay}</TableCell>
                                <TableCell align="right" sx={{ whiteSpace: "nowrap", p: "0 4px" }}>
                                    {/* "SCX Admin Live Circuit Inventory reduce
                                        inter row width, realign Action
                                        placeholders" - size="small" (matches
                                        DeliveryOrderTable.js's own compact
                                        action icons) instead of the default
                                        40px hit area, which was forcing every
                                        row taller/wider than the rest of this
                                        already-compact table. */}
                                    {isAdmin && (
                                        <IconButton
                                            size="small"
                                            aria-label={`edit ${row.vendorCircuitId || row.code}`}
                                            onClick={() => setCircuitToEdit(row)}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    {canEditStatusForRow(row) && (
                                        <IconButton
                                            size="small"
                                            aria-label={`edit status ${row.vendorCircuitId || row.code}`}
                                            title="Change Circuit Status"
                                            onClick={() => setCircuitToEditStatus(row)}
                                        >
                                            <SwapHorizIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    {canMove && (
                                        <IconButton
                                            size="small"
                                            aria-label={`move ${row.vendorCircuitId || row.code}`}
                                            title="Move to another site"
                                            onClick={() => setCircuitToMove(row)}
                                        >
                                            <DriveFileMoveIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    {isAdmin && (
                                        <IconButton
                                            size="small"
                                            aria-label={`delete ${row.vendorCircuitId || row.code}`}
                                            onClick={() => setCircuitToDelete(row)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
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
                site={circuitToMove ? circuitToMove.site : null}
                onClose={() => setCircuitToMove(null)}
                onMoved={handleMoved}
            />
            <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Paper>
    )
}

CircuitInventoryTable.propTypes = {
    // e.g. ["Live"] or ["Changed", "Ceased"].
    statuses: PropTypes.arrayOf(PropTypes.string).isRequired,
    showChangeType: PropTypes.bool,
    // Seeds/re-seeds the search box - set on the Live tab by
    // Inventory.js's own onOpenChangeOrder handler.
    initialSearch: PropTypes.string,
    // Called with a Changed row's Change Order Number when its link is
    // clicked - only meaningful (and only rendered) on the Ceased tab.
    onOpenChangeOrder: PropTypes.func,
    // "Give CSV Download options for Inventory ... only to SCX Admin User" -
    // set by Inventory.js from the viewer's own role.
    canDownloadCsv: PropTypes.bool,
}

CircuitInventoryTable.defaultProps = {
    showChangeType: false,
    initialSearch: "",
    onOpenChangeOrder: undefined,
    canDownloadCsv: false,
}
