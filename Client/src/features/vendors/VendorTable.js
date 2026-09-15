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

import {changeLimit, changePage, selectGetVendorsError, selectVendorList, deactivateVendor, updateVendor} from "./vendorSlice"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { useSelector, useDispatch } from "react-redux"
import { Alert, Typography } from "@mui/material"
import _ from "lodash"
import moment from "moment"
import ConfirmDialog from "../../components/ConfirmDialog"
import EditDialog from "../../components/EditDialog"

const columns = [
    { id: "name", label: "Vendor Name"},
    { id: "code", label: "Vendor Identifier"},
    { id: "vendorUptime", label: "Vendor Uptime"},
    { id: "vendorMTTR", label: "Vendor MTTR"},
]

export default function VendorTable(props) {
    const errorMessage = useSelector(selectGetVendorsError)
    const vendorList = useSelector(selectVendorList)
    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN

    const pagination = props.pagination
    const dispatch = useDispatch()

    const [vendorToDelete, setVendorToDelete] = React.useState(null)
    const [deleting, setDeleting] = React.useState(false)
    const [vendorToEdit, setVendorToEdit] = React.useState(null)
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
            await dispatch(deactivateVendor(vendorToDelete.id)).unwrap()
            setFeedback({ severity: "success", message: `Vendor "${vendorToDelete.name}" deleted successfully` })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to delete vendor" })
        } finally {
            setDeleting(false)
            setVendorToDelete(null)
        }
    }

    const handleSaveEdit = async (values) => {
        setSaving(true)
        try {
            await dispatch(updateVendor({ vendorId: vendorToEdit.id, ...values })).unwrap()
            setFeedback({ severity: "success", message: `Vendor "${values.name}" updated successfully` })
            setVendorToEdit(null)
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update vendor" })
        } finally {
            setSaving(false)
        }
    }

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
                            {vendorList.map((row) => (
                                <TableRow key={row.id} >
                                    {columns.map((column) => (
                                        <TableCell
                                            key={`${row.id}${column.id}`}
                                        >
                                            <Typography variant="body2">{_.get(row, column.id, "")}
                                            </Typography>
                                        </TableCell>
                                    ))}
                                    <TableCell align="right">
                                        {isAdmin && (
                                            <>
                                                <IconButton
                                                    aria-label={`edit ${row.name}`}
                                                    onClick={() => setVendorToEdit(row)}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    aria-label={`delete ${row.name}`}
                                                    onClick={() => setVendorToDelete(row)}
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
                    rowsPerPageOptions={false}
                    component="div"
                    count={pagination.totalResults}
                    rowsPerPage={pagination.limit}
                    page={pagination.page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
                <ConfirmDialog
                    open={!!vendorToDelete}
                    title="Delete vendor"
                    message={`Are you sure you want to delete "${vendorToDelete && vendorToDelete.name}"? This cannot be undone.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setVendorToDelete(null)}
                    loading={deleting}
                />
                <EditDialog
                    open={!!vendorToEdit}
                    title="Edit vendor"
                    fields={[
                        { name: "name", label: "Vendor Name" },
                        { name: "vendorUptime", label: "Vendor Uptime" },
                        { name: "vendorMTTR", label: "Vendor MTTR" },
                    ]}
                    initialValues={{
                        name: vendorToEdit ? vendorToEdit.name : "",
                        vendorUptime: vendorToEdit ? vendorToEdit.vendorUptime : "",
                        vendorMTTR: vendorToEdit ? vendorToEdit.vendorMTTR : "",
                    }}
                    lastEditedNote={
                        vendorToEdit && vendorToEdit.updatedBy && vendorToEdit.updatedBy.name
                            ? `Last edited by ${vendorToEdit.updatedBy.name} on ${moment(vendorToEdit.updatedAt).format("MMM D, YYYY h:mm A")}`
                            : null
                    }
                    onSave={handleSaveEdit}
                    onCancel={() => setVendorToEdit(null)}
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

VendorTable.propTypes = {
    pagination: PropTypes.object,
}
