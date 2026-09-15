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
import EditIcon from "@mui/icons-material/Edit"
import Snackbar from "@mui/material/Snackbar"

import PropTypes from "prop-types"

// eslint-disable-next-line no-unused-vars
import {changeLimit, changePage, getCustomers, selectGetCustomersError, selectCustomerList, deactivateCustomer, updateCustomer} from "./customerSlice"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { useSelector, useDispatch } from "react-redux"
import { Alert, Typography } from "@mui/material"
import _ from "lodash"
import moment from "moment"
import ConfirmDialog from "../../components/ConfirmDialog"
import EditDialog from "../../components/EditDialog"

const columns = [
    { id: "name", label: "Customer Name"},
    { id: "code", label: "Customer Identifier"},
]

export default function CustomerTable(props) {
    const errorMessage = useSelector(selectGetCustomersError)
    const customerList = useSelector(selectCustomerList)
    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN

    const pagination = props.pagination
    const dispatch = useDispatch()

    const [customerToDelete, setCustomerToDelete] = React.useState(null)
    const [deleting, setDeleting] = React.useState(false)
    const [customerToEdit, setCustomerToEdit] = React.useState(null)
    const [saving, setSaving] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)

    const handleChangePage = (event, newPage) => {
        dispatch(changePage(newPage))
    }

    const handleChangeRowsPerPage = (event) => {
        dispatch(changeLimit(event.target.value))
    }

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await dispatch(deactivateCustomer(customerToDelete.id)).unwrap()
            setFeedback({ severity: "success", message: `Customer "${customerToDelete.name}" deleted successfully` })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to delete customer" })
        } finally {
            setDeleting(false)
            setCustomerToDelete(null)
        }
    }

    const handleSaveEdit = async (values) => {
        setSaving(true)
        try {
            await dispatch(updateCustomer({ customerId: customerToEdit.id, ...values })).unwrap()
            setFeedback({ severity: "success", message: `Customer "${values.name}" updated successfully` })
            setCustomerToEdit(null)
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update customer" })
        } finally {
            setSaving(false)
        }
    }

    // React.useEffect(() => {
    //     const data = {
    //         limit: pagination.limit,
    //         page: pagination.page +1
    //     }
    //     dispatch(getCustomers(data))
    // }, [])

    if (errorMessage) {
        return <Alert severity="error">{errorMessage}</Alert>
    }
    else {
        return (
            <Paper sx={{ width: "100%", overflow: "hidden" }}>
                <TableContainer sx={{ maxHeight: 440 }}>
                    <Table stickyHeader aria-label="sticky table">
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        style={{ minWidth: column.minWidth }}
                                    ><Typography variant="h6">{column.label}
                                        </Typography>
                                    </TableCell>
                                ))}
                                <TableCell align="right">
                                    <Typography variant="h6">Actions</Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {customerList.map((row) => (
                                <TableRow key={row.id} >
                                    {columns.map((column) => (
                                        <TableCell
                                            key={`${row._id}${column.id}`}
                                        >
                                            <Typography variant="body2">{_.get(row, column.id, "")}
                                            </Typography>

                                        </TableCell>
                                    ))}
                                    {/* <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.customerCode}</TableCell> */}
                                    {/* <TableCell>{row.role}</TableCell> */}
                                    <TableCell align="right">
                                        {isAdmin && (
                                            <>
                                                <IconButton
                                                    aria-label={`edit ${row.name}`}
                                                    onClick={() => setCustomerToEdit(row)}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    aria-label={`delete ${row.name}`}
                                                    onClick={() => setCustomerToDelete(row)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    // rowsPerPageOptions={[5, 10, 25, 100]}
                    rowsPerPageOptions={false}
                    component="div"
                    count={pagination.totalResults}
                    rowsPerPage={pagination.limit}
                    page={pagination.page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
                <ConfirmDialog
                    open={!!customerToDelete}
                    title="Delete customer"
                    message={`Are you sure you want to delete "${customerToDelete && customerToDelete.name}"? This cannot be undone.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setCustomerToDelete(null)}
                    loading={deleting}
                />
                <EditDialog
                    open={!!customerToEdit}
                    title="Edit customer"
                    fields={[{ name: "name", label: "Customer Name" }]}
                    initialValues={{ name: customerToEdit ? customerToEdit.name : "" }}
                    lastEditedNote={
                        customerToEdit && customerToEdit.updatedBy && customerToEdit.updatedBy.name
                            ? `Last edited by ${customerToEdit.updatedBy.name} on ${moment(customerToEdit.updatedAt).format("MMM D, YYYY h:mm A")}`
                            : null
                    }
                    onSave={handleSaveEdit}
                    onCancel={() => setCustomerToEdit(null)}
                    loading={saving}
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
}

CustomerTable.propTypes = {
    pagination: PropTypes.object,
}