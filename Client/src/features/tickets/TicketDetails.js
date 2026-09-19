import * as React from "react"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import Chip from "@mui/material/Chip"
import Stepper from "@mui/material/Stepper"
import Step from "@mui/material/Step"
import StepLabel from "@mui/material/StepLabel"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import FormControl from "@mui/material/FormControl"
import Select from "@mui/material/Select"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import PropTypes from "prop-types"
import _ from "lodash"
import { useSelector, useDispatch } from "react-redux"
import { getFormattedDate } from "../../utils/dates"
import { updateTicket, appendTicketDescription, uploadTicketAttachments, appendVendorDescription, uploadVendorAttachments } from "./ticketSlice"
import { downloadTicketAttachment, downloadVendorAttachment } from "./ticketsAPI"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { problemTypeOptions, priorityOptions, statusOptions, openStatusOptions, closureCodeOptions, rfoStatusOptions, vendorTicketStatusOptions } from "../../consts/ticketOptions"

const ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"

// MUI number TextFields hand back "" when empty - convert that (and any
// other non-numeric input) to null rather than sending NaN/"" to the server.
function numOrNull(value) {
    if (value === "" || value === null || value === undefined) return null
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
}

function numToInputValue(value) {
    return value === null || value === undefined ? "" : String(value)
}

// Current local time formatted for a datetime-local input ("YYYY-MM-DDTHH:mm").
function nowForDateTimeInput() {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
}

function AttachmentList({ attachments, onDownload }) {
    if (attachments.length === 0) {
        return <Typography variant="body2" color="text.secondary">No attachments</Typography>
    }
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>
            {attachments.map((attachment) => (
                <Box key={attachment._id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button size="small" onClick={() => onDownload(attachment)}>
                        {attachment.originalName}
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                        {getFormattedDate(attachment.uploadedAt)} - {_.get(attachment, "uploadedBy.name", "")}
                    </Typography>
                </Box>
            ))}
        </Box>
    )
}

AttachmentList.propTypes = {
    attachments: PropTypes.array.isRequired,
    onDownload: PropTypes.func.isRequired,
}

export default function TicketDetails({ ticket, mode }) {
    const dispatch = useDispatch()
    const currentUser = useSelector(selectUser)
    const canUpdateTicket = currentUser.role === roles.SCLOUDX_ADMIN || currentUser.role === roles.SCLOUDX_USER
    const isCustomer = currentUser.role === roles.CUSTOMER_ADMIN || currentUser.role === roles.CUSTOMER_USER
    const descriptionRef = React.useRef(null)
    const vendorDescriptionRef = React.useRef(null)

    const [activeTab, setActiveTab] = React.useState(0)

    const [problemType, setProblemType] = React.useState(_.get(ticket, "problemType", ""))
    const [otherProblemDetails, setOtherProblemDetails] = React.useState(_.get(ticket, "otherProblemDetails", ""))
    const [customerReference, setCustomerReference] = React.useState(_.get(ticket, "customerReference", ""))
    const [priority, setPriority] = React.useState(_.get(ticket, "priority", ""))
    const [status, setStatus] = React.useState(_.get(ticket, "status", "Submitted"))
    const [closureCode, setClosureCode] = React.useState(_.get(ticket, "closureCode", ""))
    const [closedAt, setClosedAt] = React.useState("")
    const [description, setDescription] = React.useState(_.get(ticket, "description", ""))
    const [scxInternalComments, setScxInternalComments] = React.useState(_.get(ticket, "scxInternalComments", ""))
    const [descriptionNote, setDescriptionNote] = React.useState("")
    const [selectedFiles, setSelectedFiles] = React.useState([])
    const [attachments, setAttachments] = React.useState(_.get(ticket, "attachments", []))
    const fileInputRef = React.useRef(null)

    const [vendorTicketId, setVendorTicketId] = React.useState(_.get(ticket, "vendorTicketId", ""))
    const [vendorTicketCreateDate, setVendorTicketCreateDate] = React.useState(_.get(ticket, "vendorTicketCreateDate", ""))
    const [vendorTicketStatus, setVendorTicketStatus] = React.useState(_.get(ticket, "vendorTicketStatus", ""))
    const [vendorTicketClosureDate, setVendorTicketClosureDate] = React.useState(_.get(ticket, "vendorTicketClosureDate", ""))
    const [vendorDescription, setVendorDescription] = React.useState(_.get(ticket, "vendorDescription", ""))
    const [vendorDescriptionNote, setVendorDescriptionNote] = React.useState("")
    const [vendorSelectedFiles, setVendorSelectedFiles] = React.useState([])
    const [vendorAttachments, setVendorAttachments] = React.useState(_.get(ticket, "vendorAttachments", []))
    const vendorFileInputRef = React.useRef(null)

    const [rfoStatus, setRfoStatus] = React.useState(_.get(ticket, "closureDetails.rfoStatus", ""))
    const [ticketStartDateTime, setTicketStartDateTime] = React.useState(_.get(ticket, "closureDetails.ticketStartDateTime", ""))
    const [actualIssueStartDateTime, setActualIssueStartDateTime] = React.useState(_.get(ticket, "closureDetails.actualIssueStartDateTime", ""))
    const [reportedToSupplier, setReportedToSupplier] = React.useState(_.get(ticket, "closureDetails.reportedToSupplier", ""))
    const [resolvedFromSupplier, setResolvedFromSupplier] = React.useState(_.get(ticket, "closureDetails.resolvedFromSupplier", ""))
    const [issueReportedResolvedToAryaka, setIssueReportedResolvedToAryaka] = React.useState(_.get(ticket, "closureDetails.issueReportedResolvedToAryaka", ""))
    const [actualDownTimeMinutes, setActualDownTimeMinutes] = React.useState(numToInputValue(_.get(ticket, "closureDetails.actualDownTimeMinutes", null)))
    const [issueResolvedDateTime, setIssueResolvedDateTime] = React.useState(_.get(ticket, "closureDetails.issueResolvedDateTime", ""))
    const [overallDownTime, setOverallDownTime] = React.useState(numToInputValue(_.get(ticket, "closureDetails.overallDownTime", null)))
    const [rfo, setRfo] = React.useState(_.get(ticket, "closureDetails.rfo", ""))
    const [reason, setReason] = React.useState(_.get(ticket, "closureDetails.reason", ""))
    const [reasonCode, setReasonCode] = React.useState(_.get(ticket, "closureDetails.reasonCode", ""))
    const [remarks, setRemarks] = React.useState(_.get(ticket, "closureDetails.remarks", ""))
    const [scloudxBucket, setScloudxBucket] = React.useState(numToInputValue(_.get(ticket, "closureDetails.scloudxBucket", null)))
    const [supplierBucket, setSupplierBucket] = React.useState(numToInputValue(_.get(ticket, "closureDetails.supplierBucket", null)))
    const [customerBucket, setCustomerBucket] = React.useState(numToInputValue(_.get(ticket, "closureDetails.customerBucket", null)))
    const [category, setCategory] = React.useState(_.get(ticket, "closureDetails.category", ""))
    const [totalMinutes, setTotalMinutes] = React.useState(numToInputValue(_.get(ticket, "closureDetails.totalMinutes", null)))
    const [downTimeMinutes, setDownTimeMinutes] = React.useState(numToInputValue(_.get(ticket, "closureDetails.downTimeMinutes", null)))
    const [uptimePercent, setUptimePercent] = React.useState(numToInputValue(_.get(ticket, "closureDetails.uptimePercent", null)))
    const [downTimeHours, setDownTimeHours] = React.useState(numToInputValue(_.get(ticket, "closureDetails.downTimeHours", null)))

    const [submitting, setSubmitting] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)

    const history = _.get(ticket, "history", [])
    const createdAt = _.get(history, "[0].updatedAt", "")
    const ticketStatus = _.get(ticket, "status")
    // Customer Communication / Vendor Communication (the core ticket fields
    // and their comment threads) are only editable from the Open Tickets
    // view - once a ticket has moved to the Closed or Completed tab, only
    // the Ticket Closure details tab may still be touched (and none at all
    // once Completed), mirroring the server's own guard in updateTicket.
    const mainFieldsLocked = mode !== "open"
    // The locally selected, not-yet-saved status - drives whether Closure
    // Code appears (Open mode only) the moment "Closed" is picked, ahead of
    // the eventual save.
    const closingNow = status === "Closed"
    // Tab 0's Status field must always include the ticket's actual current
    // value as a MenuItem (even disabled) or MUI renders it blank - Open
    // mode is the only place "Completed" is deliberately left off the list.
    const tab0StatusOptions = mode === "open" ? openStatusOptions : statusOptions

    // Description grows with every appended comment - keep the box a fixed
    // size and default the scroll position to the bottom so the latest
    // comment is visible immediately, with history reachable by scrolling up.
    React.useEffect(() => {
        if (descriptionRef.current) {
            descriptionRef.current.scrollTop = descriptionRef.current.scrollHeight
        }
    }, [description])

    React.useEffect(() => {
        if (vendorDescriptionRef.current) {
            vendorDescriptionRef.current.scrollTop = vendorDescriptionRef.current.scrollHeight
        }
    }, [vendorDescription])

    // The general ticket edit form - Open Tickets tab only (Customer/Vendor
    // Communication). Ticket Closure details has its own handler below.
    const handleSubmit = async (event) => {
        event.preventDefault()
        if (closingNow && !closureCode) {
            setFeedback({ severity: "error", message: "Closure Code is required to close a ticket" })
            return
        }
        if (closingNow && !closedAt) {
            setFeedback({ severity: "error", message: "Closed Date and Time is required to close a ticket" })
            return
        }
        setSubmitting(true)
        try {
            await dispatch(updateTicket([{
                ticketId: ticket.id,
                problemType,
                otherProblemDetails: problemType === "Other" ? otherProblemDetails : "",
                customerReference,
                priority,
                status,
                closureCode,
                closedAt: closingNow ? new Date(closedAt).toISOString() : undefined,
                scxInternalComments,
                vendorTicketId,
                vendorTicketCreateDate,
                vendorTicketStatus,
                vendorTicketClosureDate,
            }])).unwrap()
            setFeedback({ severity: "success", message: "Ticket updated successfully" })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update ticket" })
        } finally {
            setSubmitting(false)
        }
    }

    // Ticket Closure details - Closed Tickets tab only. Lets the ticket
    // either stay Closed (just resaving the closure details) or move on to
    // Completed; nothing else on the ticket changes from here.
    const handleClosureSubmit = async (event) => {
        event.preventDefault()
        setSubmitting(true)
        try {
            await dispatch(updateTicket([{
                ticketId: ticket.id,
                status,
                rfoStatus,
                ticketStartDateTime,
                actualIssueStartDateTime,
                reportedToSupplier,
                resolvedFromSupplier,
                issueReportedResolvedToAryaka,
                actualDownTimeMinutes: numOrNull(actualDownTimeMinutes),
                issueResolvedDateTime,
                overallDownTime: numOrNull(overallDownTime),
                rfo,
                reason,
                reasonCode,
                remarks,
                scloudxBucket: numOrNull(scloudxBucket),
                supplierBucket: numOrNull(supplierBucket),
                customerBucket: numOrNull(customerBucket),
                category,
                totalMinutes: numOrNull(totalMinutes),
                downTimeMinutes: numOrNull(downTimeMinutes),
                uptimePercent: numOrNull(uptimePercent),
                downTimeHours: numOrNull(downTimeHours),
            }])).unwrap()
            setFeedback({ severity: "success", message: "Ticket updated successfully" })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update ticket" })
        } finally {
            setSubmitting(false)
        }
    }

    const handleFileChange = (event) => {
        setSelectedFiles(Array.from(event.target.files))
    }

    const handleDownload = async (attachment) => {
        try {
            await downloadTicketAttachment(ticket.id, attachment._id, attachment.originalName)
        } catch (err) {
            setFeedback({ severity: "error", message: "Failed to download attachment" })
        }
    }

    // Nobody can overwrite the original Description - Customer and SCX users
    // alike can only append a new dated/attributed note below it, leaving
    // the existing text (and every prior note) intact. A comment and/or
    // attached files can be submitted together as one update.
    const handleAddComment = async () => {
        setSubmitting(true)
        try {
            if (descriptionNote.trim()) {
                await dispatch(appendTicketDescription([{
                    ticketId: ticket.id,
                    descriptionAppend: descriptionNote,
                }])).unwrap()
                const notedBlock = `[${getFormattedDate(new Date().toISOString())} - ${_.get(currentUser, "name") || _.get(currentUser, "email", "")}]: ${descriptionNote}`
                setDescription((prev) => (prev ? `${prev}\n\n${notedBlock}` : notedBlock))
                setDescriptionNote("")
            }
            if (selectedFiles.length > 0) {
                const result = await dispatch(uploadTicketAttachments({ ticketId: ticket.id, files: selectedFiles })).unwrap()
                setAttachments(_.get(result, "[0].attachments", []))
                setSelectedFiles([])
                if (fileInputRef.current) fileInputRef.current.value = ""
            }
            setFeedback({ severity: "success", message: "Update added" })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to add update" })
        } finally {
            setSubmitting(false)
        }
    }

    const handleVendorFileChange = (event) => {
        setVendorSelectedFiles(Array.from(event.target.files))
    }

    const handleVendorDownload = async (attachment) => {
        try {
            await downloadVendorAttachment(ticket.id, attachment._id, attachment.originalName)
        } catch (err) {
            setFeedback({ severity: "error", message: "Failed to download attachment" })
        }
    }

    // Vendor Communication counterpart to handleAddComment - same append-only
    // Description + optional attachments pattern, kept in its own field/list.
    const handleAddVendorComment = async () => {
        setSubmitting(true)
        try {
            if (vendorDescriptionNote.trim()) {
                await dispatch(appendVendorDescription([{
                    ticketId: ticket.id,
                    descriptionAppend: vendorDescriptionNote,
                }])).unwrap()
                const notedBlock = `[${getFormattedDate(new Date().toISOString())} - ${_.get(currentUser, "name") || _.get(currentUser, "email", "")}]: ${vendorDescriptionNote}`
                setVendorDescription((prev) => (prev ? `${prev}\n\n${notedBlock}` : notedBlock))
                setVendorDescriptionNote("")
            }
            if (vendorSelectedFiles.length > 0) {
                const result = await dispatch(uploadVendorAttachments({ ticketId: ticket.id, files: vendorSelectedFiles })).unwrap()
                setVendorAttachments(_.get(result, "[0].vendorAttachments", []))
                setVendorSelectedFiles([])
                if (vendorFileInputRef.current) vendorFileInputRef.current.value = ""
            }
            setFeedback({ severity: "success", message: "Update added" })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to add update" })
        } finally {
            setSubmitting(false)
        }
    }

    // Customer role keeps today's flat (non-tabbed) panel - Vendor
    // Communication and Ticket Closure details are SCX-only.
    if (!canUpdateTicket) {
        const ticketDone = ticketStatus === "Closed" || ticketStatus === "Completed"
        return (
            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h5" gutterBottom>Ticket Details</Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="Circuit Name" value={_.get(ticket, "circuit.name", "")} disabled />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth disabled>
                                <InputLabel id={`problem-type-${ticket.id}`}>Problem Type</InputLabel>
                                <Select labelId={`problem-type-${ticket.id}`} value={problemType} label="Problem Type">
                                    {problemTypeOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="Customer Reference" value={customerReference} disabled />
                        </Grid>
                        {problemType === "Other" && (
                            <Grid item xs={12}>
                                <TextField fullWidth multiline label="Additional Details" value={otherProblemDetails} disabled />
                            </Grid>
                        )}

                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth disabled>
                                <InputLabel id={`priority-${ticket.id}`}>Priority</InputLabel>
                                <Select labelId={`priority-${ticket.id}`} value={priority} label="Priority">
                                    {priorityOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="Created Date" value={createdAt ? getFormattedDate(createdAt) : ""} disabled />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth disabled>
                                <InputLabel id={`status-${ticket.id}`}>Status</InputLabel>
                                <Select labelId={`status-${ticket.id}`} value={status} label="Status">
                                    {statusOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                minRows={5}
                                maxRows={5}
                                label="Description"
                                value={description}
                                disabled
                                inputRef={descriptionRef}
                            />
                        </Grid>

                        {ticketDone ? (
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                    This ticket is closed - comments can no longer be added.
                                </Typography>
                            </Grid>
                        ) : (
                            <>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={3}
                                        label="Add Comments"
                                        placeholder="Add additional details - this is appended below the existing description and does not overwrite it"
                                        value={descriptionNote}
                                        onChange={(event) => setDescriptionNote(event.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button variant="outlined" component="label">
                                        Select File
                                        <input
                                            hidden
                                            multiple
                                            type="file"
                                            ref={fileInputRef}
                                            accept={ATTACHMENT_ACCEPT}
                                            onChange={handleFileChange}
                                        />
                                    </Button>
                                    {selectedFiles.length > 0 && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            {selectedFiles.map((file) => file.name).join(", ")}
                                        </Typography>
                                    )}
                                </Grid>
                                <Grid item xs={12}>
                                    <Button
                                        type="button"
                                        variant="contained"
                                        disabled={submitting || (!descriptionNote.trim() && selectedFiles.length === 0)}
                                        onClick={handleAddComment}
                                    >
                                        {submitting ? "Adding..." : "Add Comment/ File"}
                                    </Button>
                                </Grid>
                            </>
                        )}

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mt: 1 }}>Attachments</Typography>
                            <AttachmentList attachments={attachments} onDownload={handleDownload} />
                        </Grid>
                    </Grid>
                </Paper>

                <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                    {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
                </Snackbar>
            </Box>
        )
    }

    return (
        <Box sx={{ p: 2 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h5" gutterBottom>Edit / Modify Ticket</Typography>

                <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
                    <Tab label="Customer Communication" />
                    <Tab label="Vendor Communication" />
                    {mode !== "open" && <Tab label="Ticket Closure details" />}
                </Tabs>

                {(activeTab === 0 || activeTab === 1) && (
                    <Box component="form" noValidate onSubmit={handleSubmit}>
                        {activeTab === 0 && (
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Circuit Name" value={_.get(ticket, "circuit.name", "")} disabled />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth required disabled={mainFieldsLocked}>
                                        <InputLabel id={`problem-type-${ticket.id}`}>Problem Type</InputLabel>
                                        <Select
                                            labelId={`problem-type-${ticket.id}`}
                                            value={problemType}
                                            label="Problem Type"
                                            onChange={(event) => setProblemType(event.target.value)}
                                        >
                                            {problemTypeOptions.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="Customer Reference"
                                        value={customerReference}
                                        onChange={(event) => setCustomerReference(event.target.value)}
                                        disabled={mainFieldsLocked}
                                    />
                                </Grid>
                                {problemType === "Other" && (
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            minRows={2}
                                            label="Additional Details"
                                            value={otherProblemDetails}
                                            onChange={(event) => setOtherProblemDetails(event.target.value)}
                                            disabled={mainFieldsLocked}
                                        />
                                    </Grid>
                                )}

                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth required disabled={mainFieldsLocked}>
                                        <InputLabel id={`priority-${ticket.id}`}>Priority</InputLabel>
                                        <Select
                                            labelId={`priority-${ticket.id}`}
                                            value={priority}
                                            label="Priority"
                                            onChange={(event) => setPriority(event.target.value)}
                                        >
                                            {priorityOptions.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Created Date" value={createdAt ? getFormattedDate(createdAt) : ""} disabled />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth required disabled={mainFieldsLocked}>
                                        <InputLabel id={`status-${ticket.id}`}>Status</InputLabel>
                                        <Select
                                            labelId={`status-${ticket.id}`}
                                            value={status}
                                            label="Status"
                                            onChange={(event) => {
                                                setStatus(event.target.value)
                                                if (event.target.value === "Closed" && !closedAt) {
                                                    setClosedAt(nowForDateTimeInput())
                                                }
                                            }}
                                        >
                                            {tab0StatusOptions.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                {mode === "open" && closingNow && (
                                    <>
                                        {/* A spacer plus Closed Date and Time push Closure Code into
                                            the same column as Status directly above it (Priority/
                                            Created Date/Status fill the row above, 3 x sm4). */}
                                        <Grid item xs={false} sm={4} sx={{ display: { xs: "none", sm: "block" } }} />
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                required
                                                type="datetime-local"
                                                label="Closed Date and Time"
                                                InputLabelProps={{ shrink: true }}
                                                value={closedAt}
                                                onChange={(event) => setClosedAt(event.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <FormControl fullWidth required>
                                                <InputLabel id={`closure-code-${ticket.id}`}>Closure Code</InputLabel>
                                                <Select
                                                    labelId={`closure-code-${ticket.id}`}
                                                    value={closureCode}
                                                    label="Closure Code"
                                                    onChange={(event) => setClosureCode(event.target.value)}
                                                >
                                                    {closureCodeOptions.map((option) => (
                                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    </>
                                )}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={5}
                                        maxRows={5}
                                        label="Description"
                                        value={description}
                                        disabled
                                        inputRef={descriptionRef}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={5}
                                        label="SCX Internal Comments"
                                        value={scxInternalComments}
                                        onChange={(event) => setScxInternalComments(event.target.value)}
                                        disabled={mainFieldsLocked}
                                    />
                                </Grid>

                                {!mainFieldsLocked && (
                                    <Grid item xs={12}>
                                        <Button type="submit" variant="contained" disabled={submitting}>
                                            {submitting ? "Saving..." : "Save"}
                                        </Button>
                                    </Grid>
                                )}

                                {mainFieldsLocked ? (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.secondary">
                                            This ticket is closed - comments can no longer be added.
                                        </Typography>
                                    </Grid>
                                ) : (
                                    <>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                multiline
                                                minRows={3}
                                                label="Add Comments"
                                                placeholder="Add additional details - this is appended below the existing description and does not overwrite it"
                                                value={descriptionNote}
                                                onChange={(event) => setDescriptionNote(event.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Button variant="outlined" component="label">
                                                Select File
                                                <input
                                                    hidden
                                                    multiple
                                                    type="file"
                                                    ref={fileInputRef}
                                                    accept={ATTACHMENT_ACCEPT}
                                                    onChange={handleFileChange}
                                                />
                                            </Button>
                                            {selectedFiles.length > 0 && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                    {selectedFiles.map((file) => file.name).join(", ")}
                                                </Typography>
                                            )}
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Button
                                                type="button"
                                                variant="contained"
                                                disabled={submitting || (!descriptionNote.trim() && selectedFiles.length === 0)}
                                                onClick={handleAddComment}
                                            >
                                                {submitting ? "Adding..." : "Add Comment/ File"}
                                            </Button>
                                        </Grid>
                                    </>
                                )}

                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" sx={{ mt: 1 }}>Attachments</Typography>
                                    <AttachmentList attachments={attachments} onDownload={handleDownload} />
                                </Grid>
                            </Grid>
                        )}

                        {activeTab === 1 && (
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Vendor Name" value={_.get(ticket, "vendor.name", "")} disabled />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Vendor Circuit ID" value={_.get(ticket, "vendorCircuitId", "")} disabled />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="Vendor Ticket Number"
                                        value={vendorTicketId}
                                        onChange={(event) => setVendorTicketId(event.target.value)}
                                        disabled={mainFieldsLocked}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        type="datetime-local"
                                        label="Vendor Ticket Create Date and Time"
                                        InputLabelProps={{ shrink: true }}
                                        value={vendorTicketCreateDate}
                                        onChange={(event) => setVendorTicketCreateDate(event.target.value)}
                                        disabled={mainFieldsLocked}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth disabled={mainFieldsLocked}>
                                        <InputLabel id={`vendor-ticket-status-${ticket.id}`}>Vendor Ticket Status</InputLabel>
                                        <Select
                                            labelId={`vendor-ticket-status-${ticket.id}`}
                                            value={vendorTicketStatus}
                                            label="Vendor Ticket Status"
                                            onChange={(event) => setVendorTicketStatus(event.target.value)}
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {vendorTicketStatusOptions.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        type="datetime-local"
                                        label="Vendor Ticket Closure Date and Time"
                                        InputLabelProps={{ shrink: true }}
                                        value={vendorTicketClosureDate}
                                        onChange={(event) => setVendorTicketClosureDate(event.target.value)}
                                        disabled={mainFieldsLocked}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={5}
                                        maxRows={5}
                                        label="Description"
                                        value={vendorDescription}
                                        disabled
                                        inputRef={vendorDescriptionRef}
                                    />
                                </Grid>

                                {!mainFieldsLocked && (
                                    <Grid item xs={12}>
                                        <Button type="submit" variant="contained" disabled={submitting}>
                                            {submitting ? "Saving..." : "Save"}
                                        </Button>
                                    </Grid>
                                )}

                                {mainFieldsLocked ? (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.secondary">
                                            This ticket is closed - comments can no longer be added.
                                        </Typography>
                                    </Grid>
                                ) : (
                                    <>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                multiline
                                                minRows={3}
                                                label="Add Comments"
                                                placeholder="Add additional details - this is appended below the existing description and does not overwrite it"
                                                value={vendorDescriptionNote}
                                                onChange={(event) => setVendorDescriptionNote(event.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Button variant="outlined" component="label">
                                                Select File
                                                <input
                                                    hidden
                                                    multiple
                                                    type="file"
                                                    ref={vendorFileInputRef}
                                                    accept={ATTACHMENT_ACCEPT}
                                                    onChange={handleVendorFileChange}
                                                />
                                            </Button>
                                            {vendorSelectedFiles.length > 0 && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                    {vendorSelectedFiles.map((file) => file.name).join(", ")}
                                                </Typography>
                                            )}
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Button
                                                type="button"
                                                variant="contained"
                                                disabled={submitting || (!vendorDescriptionNote.trim() && vendorSelectedFiles.length === 0)}
                                                onClick={handleAddVendorComment}
                                            >
                                                {submitting ? "Adding..." : "Add Comment/ File"}
                                            </Button>
                                        </Grid>
                                    </>
                                )}

                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" sx={{ mt: 1 }}>Attachments</Typography>
                                    <AttachmentList attachments={vendorAttachments} onDownload={handleVendorDownload} />
                                </Grid>
                            </Grid>
                        )}
                    </Box>
                )}

                {activeTab === 2 && mode !== "open" && (
                    <Box component="form" noValidate onSubmit={handleClosureSubmit}>
                        <Grid container spacing={2}>
                            {mode === "closed" && (
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth required>
                                        <InputLabel id={`closure-status-${ticket.id}`}>Status</InputLabel>
                                        <Select
                                            labelId={`closure-status-${ticket.id}`}
                                            value={status}
                                            label="Status"
                                            onChange={(event) => setStatus(event.target.value)}
                                        >
                                            <MenuItem value="Closed">Closed</MenuItem>
                                            <MenuItem value="Completed">Completed</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth disabled={mode === "completed"}>
                                    <InputLabel id="rfo-status-label">RFO Status</InputLabel>
                                    <Select
                                        labelId="rfo-status-label"
                                        value={rfoStatus}
                                        label="RFO Status"
                                        onChange={(event) => setRfoStatus(event.target.value)}
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {rfoStatusOptions.map((option) => (
                                            <MenuItem key={option} value={option}>{option}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="datetime-local"
                                    label="Ticket Start Date & Time (IST)"
                                    InputLabelProps={{ shrink: true }}
                                    value={ticketStartDateTime}
                                    onChange={(event) => setTicketStartDateTime(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="datetime-local"
                                    label="Actual Issue Start Date & Time"
                                    InputLabelProps={{ shrink: true }}
                                    value={actualIssueStartDateTime}
                                    onChange={(event) => setActualIssueStartDateTime(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="datetime-local"
                                    label="Reported to Supplier"
                                    InputLabelProps={{ shrink: true }}
                                    value={reportedToSupplier}
                                    onChange={(event) => setReportedToSupplier(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="datetime-local"
                                    label="Resolved from Supplier"
                                    InputLabelProps={{ shrink: true }}
                                    value={resolvedFromSupplier}
                                    onChange={(event) => setResolvedFromSupplier(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="datetime-local"
                                    label="Issue reported resolved to Aryaka"
                                    InputLabelProps={{ shrink: true }}
                                    value={issueReportedResolvedToAryaka}
                                    onChange={(event) => setIssueReportedResolvedToAryaka(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Actual Down time (Minutes)"
                                    value={actualDownTimeMinutes}
                                    onChange={(event) => setActualDownTimeMinutes(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="datetime-local"
                                    label="Issue resolved Date & Time (IST)"
                                    InputLabelProps={{ shrink: true }}
                                    value={issueResolvedDateTime}
                                    onChange={(event) => setIssueResolvedDateTime(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Overall Down Time"
                                    value={overallDownTime}
                                    onChange={(event) => setOverallDownTime(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="RFO" value={rfo} onChange={(event) => setRfo(event.target.value)} disabled={mode === "completed"} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} disabled={mode === "completed"} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Reason Code" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} disabled={mode === "completed"} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} disabled={mode === "completed"} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Scloudx Bucket"
                                    value={scloudxBucket}
                                    onChange={(event) => setScloudxBucket(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Supplier Bucket"
                                    value={supplierBucket}
                                    onChange={(event) => setSupplierBucket(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Customer Bucket"
                                    value={customerBucket}
                                    onChange={(event) => setCustomerBucket(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Category" value={category} onChange={(event) => setCategory(event.target.value)} disabled={mode === "completed"} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Total Minutes"
                                    value={totalMinutes}
                                    onChange={(event) => setTotalMinutes(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Down Time Minutes"
                                    value={downTimeMinutes}
                                    onChange={(event) => setDownTimeMinutes(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Uptime %"
                                    value={uptimePercent}
                                    onChange={(event) => setUptimePercent(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Down Time Hours"
                                    value={downTimeHours}
                                    onChange={(event) => setDownTimeHours(event.target.value)}
                                    disabled={mode === "completed"}
                                />
                            </Grid>

                            {mode === "closed" && (
                                <Grid item xs={12}>
                                    <Button type="submit" variant="contained" disabled={submitting}>
                                        {submitting ? "Saving..." : "Save"}
                                    </Button>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                )}
            </Paper>

            {!isCustomer && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Activity Log</Typography>
                    {history.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No activity yet</Typography>
                    ) : (
                        <Stepper orientation="vertical" nonLinear>
                            {history.map((item, index) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <Step key={index} completed active>
                                    <StepLabel>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <Chip size="small" label={item.status} />
                                            <Typography variant="caption" color="text.secondary">
                                                {getFormattedDate(item.updatedAt)} - {_.get(item, "user.name", "")}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2">{item.comment}</Typography>
                                    </StepLabel>
                                </Step>
                            ))}
                        </Stepper>
                    )}
                </Paper>
            )}

            <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Box>
    )
}

TicketDetails.propTypes = {
    ticket: PropTypes.object.isRequired,
    mode: PropTypes.oneOf(["open", "closed", "completed"]),
}

TicketDetails.defaultProps = {
    mode: "open",
}
