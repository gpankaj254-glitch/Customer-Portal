import * as React from "react"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
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
import AttachFileIcon from "@mui/icons-material/AttachFile"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import PropTypes from "prop-types"
import _ from "lodash"
import { useDispatch, useSelector } from "react-redux"
import { updateOpportunity, uploadSupplierCommunicationAttachment } from "./opportunitySlice"
import { downloadSupplierCommunicationAttachment } from "./opportunityAPI"
import { supplierQuoteStatusOptions } from "../../consts/opportunityCommOptions"
import { currencyOptions } from "../../consts/currencyOptions"
import { bandwidthOptions } from "../../consts/circuitOptions"
import { selectVendorList } from "../vendors/vendorSlice"
import ConfirmDialog from "../../components/ConfirmDialog"
import EditDialog from "../../components/EditDialog"
import { getFormattedDateTime as formatDateTime } from "../../utils/dates"
import StatusHistoryDialog from "../../components/StatusHistoryDialog"

const ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"

// Upload/list/download UI for one Supplier Communication entry's
// attachments - only usable once the entry has a real _id (i.e. it's been
// saved at least once), since attachments upload straight to the server
// against that id rather than living in local unsaved state.
function SupplierAttachmentsDialog({ open, opportunityId, entry, onClose, readOnly = false }) {
    const dispatch = useDispatch()
    const [uploading, setUploading] = React.useState(false)
    const [error, setError] = React.useState("")
    const fileInputRef = React.useRef(null)

    const attachments = _.get(entry, "attachments", [])

    const handleFilesSelected = async (event) => {
        const files = Array.from(event.target.files || [])
        event.target.value = ""
        if (files.length === 0) return
        setUploading(true)
        setError("")
        try {
            await dispatch(uploadSupplierCommunicationAttachment({
                opportunityId,
                entryId: entry._id,
                files,
            })).unwrap()
        } catch (err) {
            setError(err || "Failed to upload attachment(s)")
        } finally {
            setUploading(false)
        }
    }

    const handleDownload = async (attachment) => {
        try {
            await downloadSupplierCommunicationAttachment(opportunityId, entry._id, attachment._id, attachment.originalName)
        } catch (err) {
            setError("Failed to download attachment")
        }
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontSize: "1.1rem" }}>Attachments</DialogTitle>
            <DialogContent>
                {attachments.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        No attachments
                    </Typography>
                )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2 }}>
                    {attachments.map((attachment) => (
                        <Box key={attachment._id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Button size="small" onClick={() => handleDownload(attachment)}>
                                {attachment.originalName}
                            </Button>
                            <Typography variant="caption" color="text.secondary">
                                {formatDateTime(attachment.uploadedAt)} - {_.get(attachment, "uploadedBy.name", "")}
                            </Typography>
                        </Box>
                    ))}
                </Box>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {!readOnly && (
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={ATTACHMENT_ACCEPT}
                            style={{ display: "none" }}
                            onChange={handleFilesSelected}
                        />
                        <Button
                            variant="outlined"
                            startIcon={<AttachFileIcon />}
                            disabled={uploading}
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        >
                            {uploading ? "Uploading..." : "Add Files"}
                        </Button>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}

SupplierAttachmentsDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    opportunityId: PropTypes.string,
    entry: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    readOnly: PropTypes.bool,
}

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
        // "Edit Supplier Communication: Add Field - bandwith, Remarks".
        {
            name: "bandwidth",
            label: "Bandwidth",
            type: "select",
            options: [{ value: "", label: "None" }, ...bandwidthOptions.map((option) => ({ value: option, label: option }))],
        },
        { name: "remarks", label: "Remarks" },
    ]
}
const supplierCommunicationNumberFields = ["nrc", "mrc"]

const supplierCommunicationColumns = [
    { id: "supplier", label: "Supplier" },
    { id: "quoteRequestDate", label: "Quote Request Date", format: formatDateTime },
    { id: "lec", label: "LEC" },
    { id: "quoteStatus", label: "Quote Status" },
    // "Remove Quote Status Date and add Currency NRC, MRC" - already
    // editable per entry (see buildSupplierCommunicationFields above), just
    // not previously shown in the list itself.
    { id: "currency", label: "Currency" },
    { id: "nrc", label: "NRC" },
    { id: "mrc", label: "MRC" },
    { id: "bandwidth", label: "Bandwidth" },
    { id: "remarks", label: "Remarks" },
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
function CommunicationList({ entries, onChange, columns, fields, numberFields, entityLabel, opportunityId, showAttachments, readOnly }) {
    const [editingIndex, setEditingIndex] = React.useState(null) // -1 = adding new
    const [deletingIndex, setDeletingIndex] = React.useState(null)
    const [viewingLogIndex, setViewingLogIndex] = React.useState(null)
    const [viewingAttachmentsIndex, setViewingAttachmentsIndex] = React.useState(null)

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
            {!readOnly && (
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                    <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setEditingIndex(-1)}>
                        Add {entityLabel}
                    </Button>
                </Box>
            )}
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
                                    {!readOnly && (
                                        <>
                                            <IconButton aria-label={`edit ${entityLabel} ${index}`} onClick={() => setEditingIndex(index)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton aria-label={`delete ${entityLabel} ${index}`} onClick={() => setDeletingIndex(index)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </>
                                    )}
                                    <IconButton aria-label={`log ${entityLabel} ${index}`} onClick={() => setViewingLogIndex(index)}>
                                        <HistoryIcon fontSize="small" />
                                    </IconButton>
                                    {showAttachments && (
                                        <IconButton
                                            aria-label={`attachments ${entityLabel} ${index}`}
                                            disabled={!entry._id}
                                            title={entry._id ? "Attachments" : "Save this entry first to add attachments"}
                                            onClick={() => setViewingAttachmentsIndex(index)}
                                        >
                                            <AttachFileIcon fontSize="small" />
                                        </IconButton>
                                    )}
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
            {showAttachments && (
                <SupplierAttachmentsDialog
                    open={viewingAttachmentsIndex !== null}
                    opportunityId={opportunityId}
                    entry={viewingAttachmentsIndex !== null ? entries[viewingAttachmentsIndex] : null}
                    onClose={() => setViewingAttachmentsIndex(null)}
                    readOnly={readOnly}
                />
            )}
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
    opportunityId: PropTypes.string,
    showAttachments: PropTypes.bool,
    readOnly: PropTypes.bool,
}

CommunicationList.defaultProps = {
    opportunityId: undefined,
    showAttachments: false,
    readOnly: false,
}

// One field in the Opportunity Details read-only summary below - "Why
// Opportunity Details are in plain text, not in Field Form?" - rendered as
// a disabled, bordered TextField (same look as Create Opportunity's own
// fields) instead of plain label/value text.
function DetailItem({ label, value, fullWidth, multiline }) {
    return (
        <Grid item xs={12} sm={fullWidth ? 12 : 6} md={fullWidth ? 12 : 4}>
            <TextField
                fullWidth
                size="small"
                disabled
                multiline={multiline}
                minRows={multiline ? 3 : undefined}
                label={label}
                value={value || ""}
            />
        </Grid>
    )
}

DetailItem.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string,
    fullWidth: PropTypes.bool,
    multiline: PropTypes.bool,
}

DetailItem.defaultProps = {
    value: "",
    fullWidth: false,
    multiline: false,
}

// "New Tab before supplier communication - Opportunity Details - Display
// all information captured under create opportunity with Edit option" -
// read-only view of every field Create Opportunity captures (name/customer/
// prospect/description plus the whole Customer Request section), with an
// Edit button that opens the same Edit Opportunity dialog as the row's own
// pencil icon (onEdit, passed down from OpportunityTable).
function OpportunityDetailsView({ opportunity, onEdit }) {
    const customerRequest = _.get(opportunity, "customerRequest", {})
    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                {onEdit && (
                    <Button startIcon={<EditIcon />} variant="outlined" onClick={onEdit}>
                        Edit
                    </Button>
                )}
            </Box>
            <Grid container spacing={2}>
                <DetailItem label="Opportunity Name" value={opportunity.name} />
                <DetailItem label="Customer / Prospect" value={_.get(opportunity, "customer.name") || opportunity.prospectName} />
                <DetailItem label="Stage" value={opportunity.stage} />
                <DetailItem label="Description" value={opportunity.description} fullWidth multiline />
                <DetailItem label="Request ID" value={customerRequest.requestId} />
                <DetailItem label="Request Date" value={customerRequest.requestDate} />
                <DetailItem label="Link Type" value={customerRequest.linkType} />
                <DetailItem label="Site Address" value={customerRequest.siteAddress} />
                <DetailItem label="City" value={customerRequest.city} />
                <DetailItem label="State" value={customerRequest.state} />
                <DetailItem label="ZIP Code" value={customerRequest.zipCode} />
                <DetailItem label="Country" value={customerRequest.country} />
                <DetailItem label="Product" value={customerRequest.product} />
                <DetailItem label="IP Requirement" value={customerRequest.ipRequirement} />
                <DetailItem label="Interface" value={customerRequest.interface} />
                <DetailItem label="Down Bandwidth" value={customerRequest.downBandwidth} />
                <DetailItem label="Up Bandwidth" value={customerRequest.upBandwidth} />
                <DetailItem label="Contract Term" value={customerRequest.contractTerm} />
            </Grid>
        </Box>
    )
}

OpportunityDetailsView.propTypes = {
    opportunity: PropTypes.object.isRequired,
    onEdit: PropTypes.func,
}

OpportunityDetailsView.defaultProps = {
    onEdit: undefined,
}

export default function OpportunityDetails({ opportunity, readOnly, onEdit }) {
    const dispatch = useDispatch()
    const vendorList = useSelector(selectVendorList)
    const vendorOptions = vendorList.map((vendor) => ({ value: vendor.name, label: vendor.name }))
    const supplierCommunicationFields = buildSupplierCommunicationFields(vendorOptions)
    const [supplierCommunications, setSupplierCommunications] = React.useState(_.get(opportunity, "supplierCommunications", []))
    const [saving, setSaving] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)
    const [activeTab, setActiveTab] = React.useState(0)

    // Re-seed local list whenever the underlying opportunity actually
    // changes in Redux (e.g. after a successful save gives entries their
    // real _ids) - opportunity is a stable reference otherwise.
    React.useEffect(() => {
        setSupplierCommunications(_.get(opportunity, "supplierCommunications", []))
    }, [opportunity])

    const handleSave = async () => {
        setSaving(true)
        try {
            // statusHistory and attachments (and the older quoteStatusUpdatedAt
            // some entries still carry) are server-managed - they come back
            // from the API on read, but echoing them back on write isn't
            // allowed. The server recomputes/carries them over itself from
            // the entry's prior stored state.
            const supplierCommunicationsToSave = supplierCommunications.map((entry) =>
                _.omit(entry, ["statusHistory", "quoteStatusUpdatedAt", "attachments"])
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
                <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
                    <Tab label="Opportunity Details" />
                    <Tab label="Supplier Communication" />
                </Tabs>

                {activeTab === 0 && (
                    <OpportunityDetailsView opportunity={opportunity} onEdit={readOnly ? undefined : onEdit} />
                )}

                {activeTab === 1 && (
                    <>
                        <CommunicationList
                            entries={supplierCommunications}
                            onChange={setSupplierCommunications}
                            columns={supplierCommunicationColumns}
                            fields={supplierCommunicationFields}
                            numberFields={supplierCommunicationNumberFields}
                            entityLabel="Supplier Communication"
                            opportunityId={opportunity.id}
                            showAttachments
                            readOnly={readOnly}
                        />

                        {!readOnly && (
                            <Box sx={{ mt: 2 }}>
                                <Button variant="contained" onClick={handleSave} disabled={saving}>
                                    {saving ? "Saving..." : "Save Communications"}
                                </Button>
                            </Box>
                        )}
                    </>
                )}
            </Paper>

            <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Box>
    )
}

OpportunityDetails.propTypes = {
    opportunity: PropTypes.object.isRequired,
    // "remove Sales Opportunity Edit Option from Management Login, they
    // should only view the opportunity and see the activity log" - hides
    // Add/Edit/Delete and Save Communications; the Activity Log and
    // Attachments view icons stay available either way.
    readOnly: PropTypes.bool,
    // Opens the same Edit Opportunity dialog as the row's pencil icon
    // (owned by OpportunityTable, passed down) - the Opportunity Details
    // tab's own Edit button. Omitted entirely when readOnly.
    onEdit: PropTypes.func,
}

OpportunityDetails.defaultProps = {
    readOnly: false,
    onEdit: undefined,
}
