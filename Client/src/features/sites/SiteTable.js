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
import Checkbox from "@mui/material/Checkbox"
import Toolbar from "@mui/material/Toolbar"
import Button from "@mui/material/Button"
import Snackbar from "@mui/material/Snackbar"
import { Alert, Typography } from "@mui/material"
import PropTypes from "prop-types"
import _ from "lodash"
import moment from "moment"

import { changeLimit, changePage, selectSiteList, selectGetSitesError, selectSearch, deactivateSite, updateSite, getSites } from "./siteSlice"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { useSelector, useDispatch } from "react-redux"
import ConfirmDialog from "../../components/ConfirmDialog"
import EditDialog from "../../components/EditDialog"

const columns = [
    { id: "name", label: "Site Name" },
    { id: "customer.name", label: "Customer" },
    { id: "location.town", label: "Town" },
    { id: "location.country", label: "Country" },
]

export default function SiteTable(props) {
    const errorMessage = useSelector(selectGetSitesError)
    const siteList = useSelector(selectSiteList)
    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN
    const search = useSelector(selectSearch)
    const pagination = props.pagination
    const dispatch = useDispatch()

    const [siteToDelete, setSiteToDelete] = React.useState(null)
    const [deleting, setDeleting] = React.useState(false)
    const [siteToEdit, setSiteToEdit] = React.useState(null)
    const [saving, setSaving] = React.useState(false)
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
    }

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await dispatch(deactivateSite(siteToDelete.id)).unwrap()
            setFeedback({ severity: "success", message: `Site "${siteToDelete.name}" deleted successfully` })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to delete site" })
        } finally {
            setDeleting(false)
            setSiteToDelete(null)
        }
    }

    const handleSaveEdit = async (values) => {
        setSaving(true)
        try {
            await dispatch(updateSite({ siteId: siteToEdit.id, ...values })).unwrap()
            setFeedback({ severity: "success", message: `Site "${values.name}" updated successfully` })
            setSiteToEdit(null)
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update site" })
        } finally {
            setSaving(false)
        }
    }

    const toggleSelected = (id) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]))
    }

    const toggleSelectAll = (event) => {
        setSelected(event.target.checked ? siteList.map((row) => row.id) : [])
    }

    const handleConfirmBulkDelete = async () => {
        setBulkDeleting(true)
        const results = await Promise.allSettled(selected.map((id) => dispatch(deactivateSite(id)).unwrap()))
        const succeeded = results.filter((result) => result.status === "fulfilled").length
        const failed = results.length - succeeded
        setFeedback(
            failed === 0
                ? { severity: "success", message: `Deleted ${succeeded} site${succeeded === 1 ? "" : "s"}` }
                : { severity: "error", message: `Deleted ${succeeded}, failed ${failed}` }
        )
        setBulkDeleting(false)
        setBulkConfirmOpen(false)
        setSelected([])
        // The local per-item removal only touches whatever's already loaded
        // (one page); deleting an entire page's worth of rows would otherwise
        // leave the table empty until the next page/limit change re-fetches.
        dispatch(getSites({ limit: pagination.limit, page: pagination.page + 1, search }))
    }

    if (errorMessage) {
        return <Alert severity="error">{errorMessage}</Alert>
    }
    const allSelected = siteList.length > 0 && selected.length === siteList.length

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
                                <TableCell key={column.id}>
                                    <Typography variant="h6">{column.label}</Typography>
                                </TableCell>
                            ))}
                            <TableCell align="right">
                                <Typography variant="h6">Actions</Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {siteList.map((row) => (
                            <TableRow key={row.id} selected={selected.includes(row.id)}>
                                {isAdmin && (
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selected.includes(row.id)}
                                            onChange={() => toggleSelected(row.id)}
                                        />
                                    </TableCell>
                                )}
                                {columns.map((column) => (
                                    <TableCell key={`${row.id}${column.id}`}>
                                        <Typography variant="body2">{_.get(row, column.id, "")}</Typography>
                                    </TableCell>
                                ))}
                                <TableCell align="right">
                                    {isAdmin && (
                                        <>
                                            <IconButton
                                                aria-label={`edit ${row.name}`}
                                                onClick={() => setSiteToEdit(row)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                aria-label={`delete ${row.name}`}
                                                onClick={() => setSiteToDelete(row)}
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
                open={bulkConfirmOpen}
                title="Delete sites"
                message={`Delete ${selected.length} selected site${selected.length === 1 ? "" : "s"}? This cannot be undone.`}
                onConfirm={handleConfirmBulkDelete}
                onCancel={() => setBulkConfirmOpen(false)}
                loading={bulkDeleting}
            />
            <ConfirmDialog
                open={!!siteToDelete}
                title="Delete site"
                message={`Are you sure you want to delete "${siteToDelete && siteToDelete.name}"? This cannot be undone.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setSiteToDelete(null)}
                loading={deleting}
            />
            <EditDialog
                open={!!siteToEdit}
                title="Edit site"
                fields={[
                    { name: "name", label: "Site Name" },
                    { name: "category", label: "Category" },
                    { name: "customerSiteIdentifier", label: "End User" },
                ]}
                initialValues={{
                    name: siteToEdit ? siteToEdit.name : "",
                    category: siteToEdit ? siteToEdit.category : "",
                    customerSiteIdentifier: siteToEdit ? siteToEdit.customerSiteIdentifier : "",
                }}
                lastEditedNote={
                    siteToEdit && siteToEdit.updatedBy && siteToEdit.updatedBy.name
                        ? `Last edited by ${siteToEdit.updatedBy.name} on ${moment(siteToEdit.updatedAt).format("MMM D, YYYY h:mm A")}`
                        : null
                }
                onSave={handleSaveEdit}
                onCancel={() => setSiteToEdit(null)}
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

SiteTable.propTypes = {
    pagination: PropTypes.object,
}