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
import LockResetIcon from "@mui/icons-material/LockReset"
import Checkbox from "@mui/material/Checkbox"
import Toolbar from "@mui/material/Toolbar"
import Button from "@mui/material/Button"
import Snackbar from "@mui/material/Snackbar"
import { Alert, Typography} from "@mui/material"

import PropTypes from "prop-types"

import {changeLimit, changePage, selectUserList, selectGetUsersError, selectSearch, deleteUser, updateUser, resetUserPassword, getUsers} from "./userSlice"
import { selectUser } from "../auth/authSlice"
import { selectCustomerList } from "../customers/customerSlice"
import { selectVendorList } from "../vendors/vendorSlice"
import { roles, roleList } from "../../consts"
import { roleNames } from "../../strings"
import { useSelector, useDispatch } from "react-redux"
import moment from "moment"
import _ from "lodash"
import ConfirmDialog from "../../components/ConfirmDialog"
import EditDialog from "../../components/EditDialog"
import ResetPasswordDialog from "../../components/ResetPasswordDialog"

const columns = [
    { id: "name", label: "User Name"},
    { id: "email", label: "User Email"},
    { id: "role", label: "User Role"},
    { id: "description", label: "Description"},
]

// SCX users show as "SCX Admin"/"SCX NOC"/etc; Customer/Vendor users show as
// their Customer/Vendor name followed by Admin/User, e.g. "Aryaka Networks Admin".
function getUserTypeLabel(role) {
    return role === roles.SCLOUDX_ADMIN || role === roles.CUSTOMER_ADMIN || role === roles.VENDOR_ADMIN
        ? "Admin"
        : "User"
}

// SCX role display names that don't follow the "SCX Admin"/"SCX User" pattern.
const SCX_ROLE_LABELS = {
    [roles.SCLOUDX_USER]: "SCX NOC",
    [roles.SCLOUDX_SALES_ADMIN]: "SCX Sales Admin",
    [roles.SCLOUDX_SALES_USER]: "SCX Sales",
    [roles.SCLOUDX_FINANCE]: "SCX Finance",
    [roles.SCLOUDX_SERVICE_DELIVERY]: "SCX Service Delivery",
    [roles.SCLOUDX_MANAGEMENT]: "SCX Management",
}

function getRoleDisplay(row) {
    if (SCX_ROLE_LABELS[row.role]) {
        return SCX_ROLE_LABELS[row.role]
    }
    const userType = getUserTypeLabel(row.role)
    if (row.role === roles.CUSTOMER_ADMIN || row.role === roles.CUSTOMER_USER) {
        return `${_.get(row, "customer.name", "")} ${userType}`.trim()
    }
    if (row.role === roles.VENDOR_ADMIN || row.role === roles.VENDOR_USER) {
        return `${_.get(row, "vendor.name", "")} ${userType}`.trim()
    }
    return `SCX ${userType}`
}

const CUSTOMER_ROLE_OPTIONS = [roles.CUSTOMER_ADMIN, roles.CUSTOMER_USER]
// An SCX Sales Admin can only move a user to SCX Sales User (server-side
// enforced too - see updateUserById) - never promote one into a Sales Admin
// themselves, mirroring the creation restriction.
const SALES_ROLE_OPTIONS = [roles.SCLOUDX_SALES_USER]

// Changing a user's Role to a Customer/Vendor role must also assign which
// Customer/Vendor they belong to - the picker only appears once that kind
// of role is selected, mirroring CreateUser's role-driven field reveal.
// A Customer Admin managing their own users can only move them between
// Customer Admin/User (server-side enforced too) - so they get a narrower
// role list and no Customer picker at all, since it's always their own.
// An SCX Sales Admin is narrowed the same way, down to SALES_ROLE_OPTIONS.
function buildEditableFields(customerList, vendorList, isCustomerAdminActor, isSalesAdminActor) {
    const availableRoles = isCustomerAdminActor
        ? CUSTOMER_ROLE_OPTIONS
        : isSalesAdminActor
            ? SALES_ROLE_OPTIONS
            : roleList
    return (values) => {
        const fields = [
            { name: "name", label: "Name" },
            { name: "email", label: "Email" },
            {
                name: "role",
                label: "Role",
                type: "select",
                options: availableRoles.map((role) => ({ value: role, label: roleNames(role) })),
            },
        ]
        if (!isCustomerAdminActor && (values.role === roles.CUSTOMER_ADMIN || values.role === roles.CUSTOMER_USER)) {
            fields.push({
                name: "customerId",
                label: "Customer",
                type: "select",
                options: customerList.map((customer) => ({ value: customer.id, label: customer.name })),
            })
        }
        if (!isCustomerAdminActor && (values.role === roles.VENDOR_ADMIN || values.role === roles.VENDOR_USER)) {
            fields.push({
                name: "vendorId",
                label: "Vendor",
                type: "select",
                options: vendorList.map((vendor) => ({ value: vendor.id, label: vendor.name })),
            })
        }
        fields.push({ name: "description", label: "Description" })
        return fields
    }
}

// function createData(name, code, population, size) {
// 	const density = population / size
// 	return { name, code, population, size, density }
// }

export default function UserTable(props) {

    // const status = useSelector(selectPageStatus)
    const errorMessage = useSelector(selectGetUsersError)
    const userList = useSelector(selectUserList)
    const currentUser = useSelector(selectUser)
    // Customer Admins manage their own customer's users the same way SCX
    // Admins manage everyone's - scoped server-side to their own customer.
    const isCustomerAdminActor = currentUser.role === roles.CUSTOMER_ADMIN
    // SCX Sales Admins manage only SCX Sales Admin/User accounts - the list
    // itself only ever contains those (server-scoped in getUsers), and edits
    // are narrowed the same way via buildEditableFields.
    const isSalesAdminActor = currentUser.role === roles.SCLOUDX_SALES_ADMIN
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN || isCustomerAdminActor || isSalesAdminActor
    const search = useSelector(selectSearch)
    const pagination = props.pagination
    const customerList = useSelector(selectCustomerList)
    const vendorList = useSelector(selectVendorList)

    // const [page, setPage] = React.useState(0)
    // const [limit, setRowsPerPage] = React.useState(5)
    // const [rows, setRows] = React.useState(payload.results)
    const dispatch = useDispatch()

    const [userToDelete, setUserToDelete] = React.useState(null)
    const [deleting, setDeleting] = React.useState(false)
    const [userToEdit, setUserToEdit] = React.useState(null)
    const [saving, setSaving] = React.useState(false)
    const [userToResetPassword, setUserToResetPassword] = React.useState(null)
    const [resettingPassword, setResettingPassword] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)
    const [selected, setSelected] = React.useState([])
    const [bulkConfirmOpen, setBulkConfirmOpen] = React.useState(false)
    const [bulkDeleting, setBulkDeleting] = React.useState(false)

    const handleChangePage = (event, newPage) => {
        dispatch(changePage(newPage))
        setSelected([])
    }

    const handleChangeRowsPerPage = (event) => {
        dispatch(changeLimit(event.target.value))
        setSelected([])

        // const data = {
        // 	limit: rowsPerPage,
        // 	page: page +1
        // }
        // dispatch(getUsers(data))
    }

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await dispatch(deleteUser(userToDelete.id)).unwrap()
            setFeedback({ severity: "success", message: `User "${userToDelete.name}" deleted successfully` })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to delete user" })
        } finally {
            setDeleting(false)
            setUserToDelete(null)
        }
    }

    const handleSaveEdit = async (values) => {
        setSaving(true)
        try {
            await dispatch(updateUser({ userId: userToEdit.id, ...values })).unwrap()
            setFeedback({ severity: "success", message: `User "${values.name}" updated successfully` })
            setUserToEdit(null)
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update user" })
        } finally {
            setSaving(false)
        }
    }

    const handleSaveResetPassword = async (password) => {
        setResettingPassword(true)
        try {
            await dispatch(resetUserPassword({ userId: userToResetPassword.id, password })).unwrap()
            setFeedback({ severity: "success", message: `Password reset for "${userToResetPassword.name}"` })
            setUserToResetPassword(null)
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to reset password" })
        } finally {
            setResettingPassword(false)
        }
    }

    const toggleSelected = (id) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]))
    }

    const toggleSelectAll = (event) => {
        setSelected(event.target.checked ? userList.map((row) => row.id) : [])
    }

    const handleConfirmBulkDelete = async () => {
        setBulkDeleting(true)
        const results = await Promise.allSettled(selected.map((id) => dispatch(deleteUser(id)).unwrap()))
        const succeeded = results.filter((result) => result.status === "fulfilled").length
        const failed = results.length - succeeded
        setFeedback(
            failed === 0
                ? { severity: "success", message: `Deleted ${succeeded} user${succeeded === 1 ? "" : "s"}` }
                : { severity: "error", message: `Deleted ${succeeded}, failed ${failed}` }
        )
        setBulkDeleting(false)
        setBulkConfirmOpen(false)
        setSelected([])
        // The local per-item removal only touches whatever's already loaded
        // (one page); deleting an entire page's worth of rows would otherwise
        // leave the table empty until the next page/limit change re-fetches.
        dispatch(getUsers({ limit: pagination.limit, page: pagination.page + 1, search }))
    }

    if (errorMessage) {
        return <Alert severity="error">{errorMessage}</Alert>
    }
    else {
        const allSelected = userList.length > 0 && selected.length === userList.length
        return (
            <Paper sx={{ width: "100%", overflow: "hidden" }}>
                {isAdmin && selected.length > 0 && (
                    <Toolbar sx={{ pl: 2 }}>
                        <Typography sx={{ flex: "1 1 100%" }} variant="subtitle1">
                            {selected.length} selected
                        </Typography>
                        <Button variant="contained" color="error" onClick={() => setBulkConfirmOpen(true)}>
                            Delete Selected
                        </Button>
                    </Toolbar>
                )}
                <TableContainer sx={{ maxHeight: 440 }}>
                    <Table stickyHeader aria-label="sticky table">
                        <TableHead>
                            <TableRow>
                                {isAdmin && (
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={allSelected}
                                            indeterminate={selected.length > 0 && !allSelected}
                                            onChange={toggleSelectAll}
                                        />
                                    </TableCell>
                                )}
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        // align="left"
                                        style={{ minWidth: column.minWidth }}
                                    >
                                        <Typography variant="h6">{column.label}
                                        </Typography>
                                    </TableCell>
                                ))}
                                <TableCell align="right">
                                    <Typography variant="h6">Actions</Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        {/* {console.log(payload)} */}
                        <TableBody>
                            {userList.map((row) => (
                                <TableRow key={row.id} selected={selected.includes(row.id)}>
                                    {isAdmin && (
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={selected.includes(row.id)}
                                                onChange={() => toggleSelected(row.id)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.email}</TableCell>
                                    <TableCell>{getRoleDisplay(row)}</TableCell>
                                    <TableCell>{row.description}</TableCell>
                                    <TableCell align="right">
                                        {isAdmin && (
                                            <>
                                                <IconButton
                                                    aria-label={`edit ${row.name}`}
                                                    onClick={() => setUserToEdit(row)}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    aria-label={`reset password ${row.name}`}
                                                    onClick={() => setUserToResetPassword(row)}
                                                >
                                                    <LockResetIcon />
                                                </IconButton>
                                                <IconButton
                                                    aria-label={`delete ${row.name}`}
                                                    onClick={() => setUserToDelete(row)}
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
                    {/* {payload.results} */}
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
                    open={bulkConfirmOpen}
                    title="Delete users"
                    message={`Delete ${selected.length} selected user${selected.length === 1 ? "" : "s"}? This cannot be undone.`}
                    onConfirm={handleConfirmBulkDelete}
                    onCancel={() => setBulkConfirmOpen(false)}
                    loading={bulkDeleting}
                />
                <ConfirmDialog
                    open={!!userToDelete}
                    title="Delete user"
                    message={`Are you sure you want to delete "${userToDelete && userToDelete.name}"? This cannot be undone.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setUserToDelete(null)}
                    loading={deleting}
                />
                <EditDialog
                    open={!!userToEdit}
                    title="Edit user"
                    fields={buildEditableFields(customerList, vendorList, isCustomerAdminActor, isSalesAdminActor)}
                    initialValues={{
                        name: userToEdit ? userToEdit.name : "",
                        email: userToEdit ? userToEdit.email : "",
                        role: userToEdit ? userToEdit.role : "",
                        customerId: userToEdit ? _.get(userToEdit, "customer.id", "") : "",
                        vendorId: userToEdit ? _.get(userToEdit, "vendor.id", "") : "",
                        description: userToEdit ? userToEdit.description : "",
                    }}
                    lastEditedNote={
                        userToEdit && userToEdit.updatedBy && userToEdit.updatedBy.name
                            ? `Last edited by ${userToEdit.updatedBy.name} on ${moment(userToEdit.updatedAt).format("MMM D, YYYY h:mm A")}`
                            : null
                    }
                    onSave={handleSaveEdit}
                    onCancel={() => setUserToEdit(null)}
                    loading={saving}
                />
                <ResetPasswordDialog
                    open={!!userToResetPassword}
                    userName={userToResetPassword ? userToResetPassword.name : ""}
                    onSave={handleSaveResetPassword}
                    onCancel={() => setUserToResetPassword(null)}
                    loading={resettingPassword}
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

UserTable.propTypes = {
    pagination: PropTypes.object
}