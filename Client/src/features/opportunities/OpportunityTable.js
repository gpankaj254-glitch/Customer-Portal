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
import Collapse from "@mui/material/Collapse"
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material"
import Snackbar from "@mui/material/Snackbar"

import PropTypes from "prop-types"

// eslint-disable-next-line no-unused-vars
import { changeLimit, changePage, getOpportunities, selectGetOpportunitiesError, selectOpportunityList, deactivateOpportunity, updateOpportunity } from "./opportunitySlice"
import { stageOptions } from "./utils"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { useSelector, useDispatch } from "react-redux"
import { Alert, Typography } from "@mui/material"
import _ from "lodash"
import ConfirmDialog from "../../components/ConfirmDialog"
import EditDialog from "../../components/EditDialog"
import OpportunityDetails from "./OpportunityDetails"

const columns = [
    { id: "opportunityId", label: "Opportunity #" },
    { id: "name", label: "Name" },
    { id: "customerOrProspect", label: "Customer / Prospect" },
    { id: "value", label: "Value" },
    { id: "stage", label: "Stage" },
    { id: "owner.name", label: "Owner" },
]

function displayCustomerOrProspect(row) {
    return _.get(row, "customer.name") || row.prospectName || ""
}

export default function OpportunityTable(props) {
    const errorMessage = useSelector(selectGetOpportunitiesError)
    const opportunityList = useSelector(selectOpportunityList)
    const currentUser = useSelector(selectUser)
    const canDelete = currentUser.role === roles.SCLOUDX_ADMIN || currentUser.role === roles.SCLOUDX_SALES_ADMIN

    const pagination = props.pagination
    const dispatch = useDispatch()

    const [opportunityToDelete, setOpportunityToDelete] = React.useState(null)
    const [deleting, setDeleting] = React.useState(false)
    const [opportunityToEdit, setOpportunityToEdit] = React.useState(null)
    const [saving, setSaving] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)
    const [open, setOpen] = React.useState(false)

    const handleRowExpand = (rowId) => {
        setOpen(open === rowId ? false : rowId)
    }

    const handleChangePage = (event, newPage) => {
        dispatch(changePage(newPage))
    }

    const handleChangeRowsPerPage = (event) => {
        dispatch(changeLimit(event.target.value))
    }

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await dispatch(deactivateOpportunity(opportunityToDelete.id)).unwrap()
            setFeedback({ severity: "success", message: `Opportunity "${opportunityToDelete.name}" deleted successfully` })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to delete opportunity" })
        } finally {
            setDeleting(false)
            setOpportunityToDelete(null)
        }
    }

    const handleSaveEdit = async (values) => {
        setSaving(true)
        try {
            const payload = {
                opportunityId: opportunityToEdit.id,
                name: values.name,
                value: values.value !== "" ? Number(values.value) : undefined,
                stage: values.stage,
                expectedCloseDate: values.expectedCloseDate,
                description: values.description,
            }
            if (values.stage === "Converted") {
                payload.convertedOrder = {
                    orderNumber: values.orderNumber || "",
                    orderValue: values.orderValue !== "" && values.orderValue !== undefined
                        ? Number(values.orderValue)
                        : undefined,
                }
            }
            await dispatch(updateOpportunity(payload)).unwrap()
            setFeedback({ severity: "success", message: `Opportunity "${values.name}" updated successfully` })
            setOpportunityToEdit(null)
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update opportunity" })
        } finally {
            setSaving(false)
        }
    }

    const editFields = (values) => {
        const fields = [
            { name: "name", label: "Opportunity Name" },
            {
                name: "stage",
                label: "Stage",
                type: "select",
                options: stageOptions.map((stage) => ({ value: stage, label: stage })),
            },
            { name: "value", label: "Estimated Value" },
            { name: "expectedCloseDate", label: "Expected Close Date" },
            { name: "description", label: "Description" },
        ]
        if (_.get(values, "stage") === "Converted") {
            fields.push(
                { name: "orderNumber", label: "Order Number" },
                { name: "orderValue", label: "Order Value" },
            )
        }
        return fields
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
                            {opportunityList.map((row) => (
                                <React.Fragment key={row.id}>
                                    <TableRow>
                                        {columns.map((column) => (
                                            <TableCell key={`${row.id}${column.id}`}>
                                                <Typography variant="body2">
                                                    {column.id === "customerOrProspect" ? displayCustomerOrProspect(row) : _.get(row, column.id, "")}
                                                </Typography>
                                            </TableCell>
                                        ))}
                                        <TableCell align="right">
                                            <IconButton
                                                aria-label={`edit ${row.name}`}
                                                onClick={() => setOpportunityToEdit(row)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            {canDelete && (
                                                <IconButton
                                                    aria-label={`delete ${row.name}`}
                                                    onClick={() => setOpportunityToDelete(row)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            )}
                                            <IconButton
                                                aria-label={`communications ${row.name}`}
                                                onClick={() => handleRowExpand(row.id)}
                                            >
                                                {open === row.id ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={columns.length + 1}>
                                            <Collapse in={open === row.id}>
                                                {open === row.id && <OpportunityDetails opportunity={row} />}
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
                    open={!!opportunityToDelete}
                    title="Delete opportunity"
                    message={`Are you sure you want to delete "${opportunityToDelete && opportunityToDelete.name}"? This cannot be undone.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setOpportunityToDelete(null)}
                    loading={deleting}
                />
                <EditDialog
                    open={!!opportunityToEdit}
                    title="Edit opportunity"
                    fields={editFields}
                    initialValues={{
                        name: opportunityToEdit ? opportunityToEdit.name : "",
                        stage: opportunityToEdit ? opportunityToEdit.stage : "New",
                        value: opportunityToEdit && opportunityToEdit.value !== null && opportunityToEdit.value !== undefined ? opportunityToEdit.value : "",
                        expectedCloseDate: opportunityToEdit ? opportunityToEdit.expectedCloseDate : "",
                        description: opportunityToEdit ? opportunityToEdit.description : "",
                        orderNumber: _.get(opportunityToEdit, "convertedOrder.orderNumber") || "",
                        orderValue: _.get(opportunityToEdit, "convertedOrder.orderValue") || "",
                    }}
                    onSave={handleSaveEdit}
                    onCancel={() => setOpportunityToEdit(null)}
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

OpportunityTable.propTypes = {
    pagination: PropTypes.object,
}
