import * as React from "react"
import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import IconButton from "@mui/material/IconButton"
import Button from "@mui/material/Button"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import AddIcon from "@mui/icons-material/Add"
import HistoryIcon from "@mui/icons-material/History"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import PropTypes from "prop-types"
import _ from "lodash"
import moment from "moment"
import { useDispatch, useSelector } from "react-redux"
import { updateOpportunity } from "./opportunitySlice"
import { supplierQuoteStatusOptions } from "../../consts/opportunityCommOptions"
import { currencyOptions } from "../../consts/currencyOptions"
import { selectVendorList } from "../vendors/vendorSlice"
import ConfirmDialog from "../../components/ConfirmDialog"
import EditDialog from "../../components/EditDialog"
import StatusHistoryDialog from "../../components/StatusHistoryDialog"

const currencySelectOptions = currencyOptions.map((option) => ({
    value: option.code,
    label: `${option.code} - ${option.name}`,
}))

function buildSupplierCommunicationFields(vendorOptions) {
    return [
        { name: "supplier", label: "Supplier", type: "autocomplete", options: vendorOptions },
        { name: "quoteRequestDate", label: "Quote Request Date", type: "date" },
        { name: "lec", label: "LEC" },
        {
            name: "quoteStatus",
            label: "Quote Status",
            type: "select",
            options: supplierQuoteStatusOptions.map((status) => ({ value: status, label: status })),
        },
        { name: "quoteSubmitDate", label: "Quote Submit Date", type: "date" },
        { name: "currency", label: "Currency", type: "autocomplete", options: currencySelectOptions },
        { name: "nrc", label: "NRC" },
        { name: "mrc", label: "MRC" },
    ]
}
const supplierCommunicationNumberFields = ["nrc", "mrc"]

function formatDateTime(value) {
    return value ? moment(value).format("MMM D, YYYY h:mm A") : ""
}

function lastStatusChangeDate(entry) {
    return formatDateTime(_.get(_.last(entry.statusHistory), "changedAt"))
}

const supplierCommunicationColumns = [
    { id: "supplier", label: "Supplier" },
    { id: "quoteRequestDate", label: "Quote Request Date", format: formatDateTime },
    { id: "lec", label: "LEC" },
    { id: "quoteStatus", label: "Quote Status" },
    { id: "quoteStatusDate", label: "Quote Status Date", render: lastStatusChangeDate },
]

function emptyValuesFor(fields) {
    return fields.reduce((acc, field) => {
        acc[field.name] = field.name === "quoteStatus" ? "Pending" : ""
        return acc
    }, {})
}

// Shared add/edit/delete list UI for Supplier Communication - entries live
// in the parent's local state (not saved until the "Save Communications"
// button).
function CommunicationList({ entries, onChange, columns, fields, numberFields, entityLabel }) {
    const [editingIndex, setEditingIndex] = React.useState(null) // -1 = adding new
    const [deletingIndex, setDeletingIndex] = React.useState(null)
    const [viewingLogIndex, setViewingLogIndex] = React.useState(null)

    const handleSaveEntry = (values) => {
        const cleaned = { ...values }
        numberFields.forEach((name) => {
            cleaned[name] = cleaned[name] === "" || cleaned[name] === null || cleaned[name] === undefined
                ? null
                : Number(cleaned[name])
        })
        const next = [...entries]
        if (editingIndex === -1) {
            next.push(cleaned)
        } else {
            next[editingIndex] = cleaned
        }
        onChange(next)
        setEditingIndex(null)
    }

    const handleConfirmDelete = () => {
        onChange(entries.filter((_entry, index) => index !== deletingIndex))
        setDeletingIndex(null)
    }

    const editingValues = editingIndex === null
        ? {}
        : editingIndex === -1
            ? emptyValuesFor(fields)
            : entries[editingIndex]

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setEditingIndex(-1)}>
                    Add {entityLabel}
                </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            {columns.map((column) => (
                                <TableCell key={column.id}>
                                    <Typography variant="subtitle2">{column.label}</Typography>
                                </TableCell>
                            ))}
                            <TableCell align="right">
                                <Typography variant="subtitle2">Actions</Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {entries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1}>
                                    <Typography variant="body2" color="text.secondary">
                                        No {entityLabel.toLowerCase()} entries yet
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {entries.map((entry, index) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <TableRow key={entry._id || index}>
                                {columns.map((column) => {
                                    const rawValue = _.get(entry, column.id, "")
                                    const cellContent = column.render
                                        ? column.render(entry)
                                        : column.format
                                            ? column.format(rawValue)
                                            : rawValue
                                    return (
                                        <TableCell key={column.id}>{cellContent}</TableCell>
                                    )
                                })}
                                <TableCell align="right">
                                    <IconButton aria-label={`edit ${entityLabel} ${index}`} onClick={() => setEditingIndex(index)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton aria-label={`delete ${entityLabel} ${index}`} onClick={() => setDeletingIndex(index)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton aria-label={`log ${entityLabel} ${index}`} onClick={() => setViewingLogIndex(index)}>
                                        <HistoryIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <EditDialog
                open={editingIndex !== null}
                title={editingIndex === -1 ? `Add ${entityLabel}` : `Edit ${entityLabel}`}
                fields={fields}
                initialValues={editingValues}
                onSave={handleSaveEntry}
                onCancel={() => setEditingIndex(null)}
                dense
            />
            <ConfirmDialog
                open={deletingIndex !== null}
                title={`Delete ${entityLabel}`}
                message={`Are you sure you want to delete this ${entityLabel.toLowerCase()} entry?`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeletingIndex(null)}
            />
            <StatusHistoryDialog
                open={viewingLogIndex !== null}
                title={`${entityLabel} Status Log`}
                history={viewingLogIndex !== null ? (entries[viewingLogIndex].statusHistory || []) : []}
                onClose={() => setViewingLogIndex(null)}
            />
        </Box>
    )
}

CommunicationList.propTypes = {
    entries: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    columns: PropTypes.array.isRequired,
    fields: PropTypes.array.isRequired,
    numberFields: PropTypes.array.isRequired,
    entityLabel: PropTypes.string.isRequired,
}

export default function OpportunityDetails({ opportunity }) {
    const dispatch = useDispatch()
    const vendorList = useSelector(selectVendorList)
    const vendorOptions = vendorList.map((vendor) => ({ value: vendor.name, label: vendor.name }))
    const supplierCommunicationFields = buildSupplierCommunicationFields(vendorOptions)
    const [supplierCommunications, setSupplierCommunications] = React.useState(_.get(opportunity, "supplierCommunications", []))
    const [saving, setSaving] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)

    // Re-seed local list whenever the underlying opportunity actually
    // changes in Redux (e.g. after a successful save gives entries their
    // real _ids) - opportunity is a stable reference otherwise.
    React.useEffect(() => {
        setSupplierCommunications(_.get(opportunity, "supplierCommunications", []))
    }, [opportunity])

    const handleSave = async () => {
        setSaving(true)
        try {
            // statusHistory (and the older quoteStatusUpdatedAt some entries
            // still carry) is server-managed - it comes back from the API on
            // read, but echoing it back on write isn't allowed. The server
            // recomputes it itself from the entry's prior stored state.
            const supplierCommunicationsToSave = supplierCommunications.map((entry) =>
                _.omit(entry, ["statusHistory", "quoteStatusUpdatedAt"])
            )
            await dispatch(updateOpportunity({
                opportunityId: opportunity.id,
                supplierCommunications: supplierCommunicationsToSave,
            })).unwrap()
            setFeedback({ severity: "success", message: "Communications saved successfully" })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to save communications" })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Box sx={{ p: 2 }}>
            <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Supplier Communication</Typography>

                <CommunicationList
                    entries={supplierCommunications}
                    onChange={setSupplierCommunications}
                    columns={supplierCommunicationColumns}
                    fields={supplierCommunicationFields}
                    numberFields={supplierCommunicationNumberFields}
                    entityLabel="Supplier Communication"
                />

                <Box sx={{ mt: 2 }}>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Communications"}
                    </Button>
                </Box>
            </Paper>

            <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Box>
    )
}

OpportunityDetails.propTypes = {
    opportunity: PropTypes.object.isRequired,
}
