import * as React from "react"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import IconButton from "@mui/material/IconButton"
import DeleteIcon from "@mui/icons-material/Delete"
import HistoryIcon from "@mui/icons-material/History"
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material"
import Collapse from "@mui/material/Collapse"
import Snackbar from "@mui/material/Snackbar"
import { Alert, Typography } from "@mui/material"
import PropTypes from "prop-types"
import _ from "lodash"
import { useDispatch, useSelector } from "react-redux"
import {
    changePage,
    changeLimit,
    selectGetOrdersError,
    selectPagination,
    deactivateDeliveryOrder,
} from "./deliveryOrderSlice"
import { selectVendorList } from "../vendors/vendorSlice"
import { formatVendorDisplay } from "../../utils/circuitDisplay"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import ConfirmDialog from "../../components/ConfirmDialog"
import OrderDetails from "./OrderDetails"
import ActivityLogDialog from "./ActivityLogDialog"
import { getFormattedDateOnly as formatDate } from "../../utils/dates"

// Same SCX-only visibility as Ticket's own Activity Log (see
// tickets/TicketsTable.js's canViewLog) - plus SCX Management, which already
// has read-only view access to Delivery Orders elsewhere.
const ACTIVITY_LOG_ROLES = [roles.SCLOUDX_ADMIN, roles.SCLOUDX_SERVICE_DELIVERY, roles.SCLOUDX_MANAGEMENT]

// Exported (not just used locally) so DeliveryOrderCharts.js's Customer
// wise/Milestone wise breakdowns stay in exact sync with this table's own
// display - no separate re-implementation to drift out of step.
export function customerName(row) {
    return _.get(row, "customer.name") || row.newCustomerName || ""
}

// Smaller fonts throughout the list - header, rows and pagination footer -
// same compacting approach as OrderDetails.js's own compactSx, so a page
// full of orders reads more densely.
const compactSx = {
    "& .MuiTableCell-root": { padding: "4px 8px" },
    "& .MuiTypography-root": { fontSize: "0.72rem" },
    "& .MuiTablePagination-toolbar": { minHeight: 36, fontSize: "0.72rem" },
    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: "0.72rem" },
}

const baseColumns = [
    { id: "orderId", label: "Order ID" },
    { id: "serialNumber", label: "Serial Number" },
    { id: "customerNameText", label: "Customer Name" },
    { id: "scloudxOrderReference", label: "SCloudX Order Ref" },
    { id: "customerOrderReference", label: "Customer PO" },
    { id: "vendorDisplay", label: "Vendor" },
    { id: "orderDateText", label: "Order Date" },
    { id: "status", label: "Status" },
]

// "Delivery Dashboard - All Roles, Do not display Order ID [or] Customer
// Order Number, Display End User Name [where Customer Order Number was] and
// LMP Name after Vendor name, Display Milestone Status (which is under
// progress) after Order Status" - only for the 3 Dashboard call sites
// (Dashboard.js's Delivery role branch, ScxDashboard.js's Delivery tab,
// ManagementDashboard.js's Delivery tab), not the full Service Delivery
// Management module (DeliveryOrders.js), which keeps Order ID/Customer PO
// and has no need for a milestone summary since OrderDetails' own tabs
// already show all of this.
//
// "In Delivered Orders List, Replace Status with Delivery Date" - every row
// there is already Status "Completed" (that's what makes it a Delivered
// Order), so the column is swapped for the actually-varying Delivery Date
// instead. Only the plain Delivered Orders tab (showDeliveryDate) - View
// Open Order and every dashboard view keep Status, since it still varies
// there.
// showCustomerPO puts the Customer PO column back for one particular
// dashboardView consumer - "Customer Admin Dashboard - New tab" (Open
// Orders) explicitly lists Customer PO Number among its columns, unlike
// the "Do not display ... Customer Order Number" instruction the other
// dashboardView call sites (Delivery/SCX Admin/NOC dashboards) follow -
// defaults false so every other dashboardView usage is unaffected.
function buildColumns(dashboardView, showDeliveryDate, showCustomerPO) {
    let columns = baseColumns
    if (dashboardView) {
        columns = baseColumns.filter(
            (column) => column.id !== "orderId" && (showCustomerPO || column.id !== "customerOrderReference")
        )
        // "Customer Name, SCloudX Order Ref, Customer PO Number, End User
        // Name, ..." - End User Name goes after Customer PO when it's kept
        // (showCustomerPO), otherwise right after SCloudX Order Ref as before.
        const endUserAfterId = showCustomerPO ? "customerOrderReference" : "scloudxOrderReference"
        const endUserAfterIndex = columns.findIndex((column) => column.id === endUserAfterId)
        columns.splice(endUserAfterIndex + 1, 0, { id: "endUser", label: "End User Name" })
        const vendorIndex = columns.findIndex((column) => column.id === "vendorDisplay")
        columns.splice(vendorIndex + 1, 0, { id: "lmpName", label: "LMP Name" })
        // Narrow, with word-wrap on the cell below - a milestone name like
        // "Configuration provisioning and testing" would otherwise stretch
        // the column (same fix already used for Vendor/Customer Circuit ID
        // elsewhere - see CircuitTable.js).
        columns.push({ id: "milestoneStatus", label: "Milestone Status", width: "10%" })
    }
    if (showDeliveryDate) {
        columns = columns.map((column) => (
            column.id === "status" ? { id: "deliveryDateText", label: "Delivery Date" } : column
        ))
    }
    return columns
}

// The name of the first milestone not yet Completed/Not Required - i.e.
// whichever one is currently under way, given the sequential gating (see
// OrderDetails.js's own previousDone, which treats the two the same way for
// unlocking - a milestone marked "Not Required" is done as far as progress
// is concerned, so it shouldn't keep showing here as the order's "current"
// one). "Completed" once every milestone is Completed/Not Required; blank
// if there are none.
export function currentMilestoneStatus(row) {
    const milestones = row.milestones || []
    const inProgress = milestones.find((milestone) => !["Completed", "Not Required"].includes(milestone.status))
    if (inProgress) {
        return inProgress.name
    }
    return milestones.length > 0 ? "Completed" : ""
}

// One table, reused for both the View Open Order and Delivered Orders tabs -
// `rows` is that tab's own list (see DeliveryOrders.js). A row expands (like
// Inventory's site rows) into the full View/Edit Orders panel
// (OrderDetails) - there's too much on that screen (the milestone table
// especially) for a small popup dialog. `canEdit`/`canDelete` render
// OrderDetails read-only and hide the Delete icon for a read-only viewer
// (SCX Management). `dashboardView` swaps in the Dashboard-only column set
// above. `showDeliveryDate` swaps the Status column for Delivery Date - set
// by DeliveryOrders.js on the Delivered Orders tab only. `liveCircuitOrderRefs`
// is passed straight through to each row's own OrderDetails, for its Existing
// Order Number dropdown.
export default function DeliveryOrderTable({ rows, canEdit, canDelete, dashboardView, showDeliveryDate, showCustomerPO, liveCircuitOrderRefs }) {
    const columns = buildColumns(dashboardView, showDeliveryDate, showCustomerPO)
    const dispatch = useDispatch()
    const errorMessage = useSelector(selectGetOrdersError)
    const pagination = useSelector(selectPagination)
    const vendorList = useSelector(selectVendorList)
    const currentUser = useSelector(selectUser)
    const canViewLog = ACTIVITY_LOG_ROLES.includes(currentUser.role)

    const [open, setOpen] = React.useState(null)
    const [orderToDelete, setOrderToDelete] = React.useState(null)
    const [deleting, setDeleting] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)
    const [logOrder, setLogOrder] = React.useState(null)

    const vendorNameById = React.useMemo(
        () => new Map(vendorList.map((vendor) => [vendor.id, vendor.name])),
        [vendorList]
    )

    const displayRows = rows.map((row) => {
        const vendorName = vendorNameById.get(row.vendorId) || ""
        return {
            ...row,
            customerNameText: customerName(row),
            vendorName,
            // "In Vendor Name - Show Vendor Name + Vendor LEC Name" -
            // Delivery Orders (Open and Delivered), combining the Vendor
            // with this order's own LMP Name field ("vendorLECName should
            // be same as LMP Name" - see deliveryOrder.service.js's
            // createCircuitFromOrder, which carries this same value over
            // onto the Circuit's own vendorLECName once the order
            // completes). Not for dashboardView, which already shows LMP
            // Name as its own separate column right after Vendor.
            vendorDisplay: dashboardView ? vendorName : formatVendorDisplay(vendorName, row.lmpName),
            orderDateText: formatDate(row.orderDate),
            deliveryDateText: formatDate(row.deliveryDate),
            milestoneStatus: dashboardView ? currentMilestoneStatus(row) : "",
        }
    })

    const handleChangePage = (event, newPage) => {
        dispatch(changePage(newPage))
    }

    const handleChangeRowsPerPage = (event) => {
        dispatch(changeLimit(event.target.value))
    }

    const handleRowClick = (rowId) => {
        setOpen(open === rowId ? null : rowId)
    }

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await dispatch(deactivateDeliveryOrder(orderToDelete.id)).unwrap()
            setFeedback({ severity: "success", message: `Order "${orderToDelete.orderId}" deleted successfully` })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to delete order" })
        } finally {
            setDeleting(false)
            setOrderToDelete(null)
        }
    }

    if (errorMessage) {
        return <Alert severity="error">{errorMessage}</Alert>
    }

    return (
        <Paper sx={{ width: "100%", overflow: "hidden", ...compactSx, p: 1 }}>
            {/* "Add # rows at top" - counts whatever's currently shown, so
                it narrows along with the search above (same convention as
                Inventory's own "Number of Circuits"). */}
            <Typography variant="subtitle1" sx={{ mb: 1, px: 1 }}>
                Number of Orders: {displayRows.length}
            </Typography>
            <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small" aria-label="delivery orders table">
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            {columns.map((column) => (
                                <TableCell key={column.id} style={{ width: column.width }}>
                                    <Typography variant="subtitle2">{column.label}</Typography>
                                </TableCell>
                            ))}
                            {(canDelete || canViewLog) && (
                                <TableCell align="right">
                                    <Typography variant="subtitle2">Actions</Typography>
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {displayRows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={columns.length + 2}>
                                    <Typography variant="body2" color="text.secondary">No delivery orders</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {displayRows.map((row) => (
                            <React.Fragment key={row.id}>
                                <TableRow>
                                    <TableCell>
                                        <IconButton size="small" aria-label={`expand ${row.orderId}`} onClick={() => handleRowClick(row.id)}>
                                            {open === row.id ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                                        </IconButton>
                                    </TableCell>
                                    {columns.map((column) => (
                                        <TableCell
                                            key={`${row.id}${column.id}`}
                                            sx={column.width ? { wordBreak: "break-word", overflowWrap: "anywhere" } : undefined}
                                        >
                                            <Typography variant="body2">{row[column.id]}</Typography>
                                        </TableCell>
                                    ))}
                                    {(canDelete || canViewLog) && (
                                        <TableCell align="right">
                                            {canViewLog && (
                                                <IconButton size="small" aria-label={`activity log ${row.orderId}`} title="Activity Log" onClick={() => setLogOrder(row)}>
                                                    <HistoryIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            {canDelete && (
                                                <IconButton size="small" aria-label={`delete ${row.orderId}`} onClick={() => setOrderToDelete(row)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                                <TableRow>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={columns.length + 2}>
                                        <Collapse in={open === row.id} unmountOnExit>
                                            <OrderDetails order={row} readOnly={!canEdit} vendorName={row.vendorName} liveCircuitOrderRefs={liveCircuitOrderRefs} />
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[100, 250, 500, 1000]}
                component="div"
                // "at bottom - Rows per page: 1-160 of 160 where as it
                // should be only 9" - pagination.totalResults is one shared
                // Redux field, but DeliveryOrders.js fires both tabs'
                // fetches together and each fulfilled response overwrites it
                // unconditionally (see deliveryOrderSlice.js), so whichever
                // tab's request resolves second stomps the other tab's own
                // total. displayRows.length is already this table's own
                // correct, tab-specific count (same one "Number of Orders"
                // above uses) - limit always fetches everything in one
                // request (1000 vs at most a few hundred orders), so it's
                // never actually a partial page either.
                count={displayRows.length}
                rowsPerPage={pagination.limit}
                page={pagination.page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />

            <ConfirmDialog
                open={!!orderToDelete}
                title="Delete delivery order"
                message={orderToDelete ? `Delete order "${orderToDelete.orderId}"? It can be restored from Deleted Orders.` : ""}
                confirmLabel="Delete"
                onConfirm={handleConfirmDelete}
                onCancel={() => setOrderToDelete(null)}
                loading={deleting}
            />

            <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>

            <ActivityLogDialog
                open={!!logOrder}
                order={logOrder}
                onClose={() => setLogOrder(null)}
            />
        </Paper>
    )
}

DeliveryOrderTable.propTypes = {
    rows: PropTypes.array.isRequired,
    canEdit: PropTypes.bool,
    canDelete: PropTypes.bool,
    dashboardView: PropTypes.bool,
    showDeliveryDate: PropTypes.bool,
    showCustomerPO: PropTypes.bool,
    // Map of normalized SCX Order Ref -> original-case ref, one entry per
    // distinct Live circuit - see DeliveryOrders.js.
    liveCircuitOrderRefs: PropTypes.instanceOf(Map),
}

DeliveryOrderTable.defaultProps = {
    canEdit: false,
    canDelete: false,
    dashboardView: false,
    showDeliveryDate: false,
    showCustomerPO: false,
    liveCircuitOrderRefs: new Map(),
}
