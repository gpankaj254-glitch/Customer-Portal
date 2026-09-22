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
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material"
import Collapse from "@mui/material/Collapse"
import Snackbar from "@mui/material/Snackbar"
import { Alert, Typography } from "@mui/material"
import PropTypes from "prop-types"
import _ from "lodash"
import moment from "moment"
import { useDispatch, useSelector } from "react-redux"
import {
    changePage,
    changeLimit,
    selectGetOrdersError,
    selectPagination,
    deactivateDeliveryOrder,
} from "./deliveryOrderSlice"
import { selectVendorList } from "../vendors/vendorSlice"
import ConfirmDialog from "../../components/ConfirmDialog"
import OrderDetails from "./OrderDetails"

function formatDate(value) {
    return value ? moment(value).format("DD-MM-YYYY") : ""
}

function customerName(row) {
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

const columns = [
    { id: "orderId", label: "Order ID" },
    { id: "serialNumber", label: "Serial Number" },
    { id: "customerNameText", label: "Customer Name" },
    { id: "scloudxOrderReference", label: "SCloudX Order Ref" },
    { id: "customerOrderReference", label: "Customer PO" },
    { id: "vendorName", label: "Vendor" },
    { id: "orderDateText", label: "Order Date" },
    { id: "status", label: "Status" },
]

// One table, reused for both the View Open Order and Delivered Orders tabs -
// `rows` is that tab's own list (see DeliveryOrders.js). A row expands (like
// Inventory's site rows) into the full View/Edit Orders panel
// (OrderDetails) - there's too much on that screen (the milestone table
// especially) for a small popup dialog. `canEdit`/`canDelete` render
// OrderDetails read-only and hide the Delete icon for a read-only viewer
// (SCX Management).
export default function DeliveryOrderTable({ rows, canEdit, canDelete }) {
    const dispatch = useDispatch()
    const errorMessage = useSelector(selectGetOrdersError)
    const pagination = useSelector(selectPagination)
    const vendorList = useSelector(selectVendorList)

    const [open, setOpen] = React.useState(null)
    const [orderToDelete, setOrderToDelete] = React.useState(null)
    const [deleting, setDeleting] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)

    const vendorNameById = React.useMemo(
        () => new Map(vendorList.map((vendor) => [vendor.id, vendor.name])),
        [vendorList]
    )

    const displayRows = rows.map((row) => ({
        ...row,
        customerNameText: customerName(row),
        vendorName: vendorNameById.get(row.vendorId) || "",
        orderDateText: formatDate(row.orderDate),
    }))

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
        <Paper sx={{ width: "100%", overflow: "hidden", ...compactSx }}>
            <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small" aria-label="delivery orders table">
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            {columns.map((column) => (
                                <TableCell key={column.id}>
                                    <Typography variant="subtitle2">{column.label}</Typography>
                                </TableCell>
                            ))}
                            {canDelete && (
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
                                        <TableCell key={`${row.id}${column.id}`}>
                                            <Typography variant="body2">{row[column.id]}</Typography>
                                        </TableCell>
                                    ))}
                                    {canDelete && (
                                        <TableCell align="right">
                                            <IconButton size="small" aria-label={`delete ${row.orderId}`} onClick={() => setOrderToDelete(row)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    )}
                                </TableRow>
                                <TableRow>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={columns.length + 2}>
                                        <Collapse in={open === row.id} unmountOnExit>
                                            <OrderDetails order={row} readOnly={!canEdit} vendorName={row.vendorName} />
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
                count={pagination.totalResults}
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
        </Paper>
    )
}

DeliveryOrderTable.propTypes = {
    rows: PropTypes.array.isRequired,
    canEdit: PropTypes.bool,
    canDelete: PropTypes.bool,
}

DeliveryOrderTable.defaultProps = {
    canEdit: false,
    canDelete: false,
}
