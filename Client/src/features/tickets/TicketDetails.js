import * as React from "react"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
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
import FormLabel from "@mui/material/FormLabel"
import RadioGroup from "@mui/material/RadioGroup"
import Radio from "@mui/material/Radio"
import FormControlLabel from "@mui/material/FormControlLabel"
import PropTypes from "prop-types"
import _ from "lodash"
import moment from "moment"
import { useSelector, useDispatch } from "react-redux"
import { getFormattedDate } from "../../utils/dates"
import { updateTicket, saveTicketRfo, appendTicketDescription, uploadTicketAttachments, appendVendorDescription, uploadVendorAttachments } from "./ticketSlice"
import { downloadTicketAttachment, downloadVendorAttachment } from "./ticketsAPI"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { problemTypeOptions, priorityOptions, statusOptions, openStatusOptions, closureCodeOptions, rfoRequestStatusOptions, rfoCodeOptions, networkIssueRfoCodes, vendorTicketStatusOptions } from "../../consts/ticketOptions"

const ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"

// Problem Start Date and Time is typed into a datetime-local box on Create
// Ticket and saved as a plain "YYYY-MM-DDTHH:mm" string (no time zone).
// Bulk-imported tickets can hold other text, so only this shape is usable
// for comparing against the Closed Date and Time.
const WALL_CLOCK = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

// "RFO Problem Start/Stop Date/Time ... IST (Converted from GMT if
// captured in GMT in RFO Tab)" - the RFO Request tab captures these as a
// plain GMT wall-clock string (see its own "(GMT)" field labels), same
// convention as Problem Start Date; the Ticket Closure Details tab instead
// shows them converted to IST (+05:30, no DST) for whoever reads this tab.
// RFO Request Date is captured directly in IST on the RFO tab already (see
// its own "(IST)" label there), so it needs no conversion - just plain
// formatting, same as today.
function formatGmtWallClockAsIst(value) {
    if (!value || !WALL_CLOCK.test(value)) return value || ""
    return moment.utc(value, "YYYY-MM-DDTHH:mm").utcOffset(330).format("DD-MMM-YY HH:mm").toUpperCase()
}

// Current local time formatted for a datetime-local input ("YYYY-MM-DDTHH:mm").
function nowForDateTimeInput() {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
}

// Same shape as nowForDateTimeInput above, but for an arbitrary already-saved
// date (e.g. ticket.closedAt) rather than "now" - used to seed the
// redesigned Ticket Closure Details tab's editable Ticket Closure Date/Time.
function dateTimeLocalValue(dateInput) {
    if (!dateInput) return ""
    const date = new Date(dateInput)
    if (Number.isNaN(date.getTime())) return ""
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
    return date.toISOString().slice(0, 16)
}

// "HH:MM" (hours can exceed 24 - a multi-day outage isn't unusual) -> total
// minutes, or null if unparseable/blank. Used for the Customer Delay/Hold
// Time input and the calculated downtime fields below it.
function parseHHMM(value) {
    const match = /^(\d+):([0-5]\d)$/.exec(_.trim(value))
    if (!match) return null
    return Number(match[1]) * 60 + Number(match[2])
}

// Total minutes -> "HH:MM" (hours not padded/capped at 24, same reasoning as
// parseHHMM above) - null/negative minutes render as "-" (not applicable/
// not yet computable, e.g. Ticket Closure Date/Time not filled in yet).
function formatMinutesToHHMM(minutes) {
    if (minutes === null || minutes === undefined || Number.isNaN(minutes) || minutes < 0) return "-"
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}:${String(mins).padStart(2, "0")}`
}

// Minutes between two datetime-local ("YYYY-MM-DDTHH:mm") strings, or null
// if either is missing/unusable.
function minutesBetween(startValue, endValue) {
    if (!startValue || !endValue) return null
    const start = new Date(startValue)
    const end = new Date(endValue)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
    return (end.getTime() - start.getTime()) / 60000
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
    // Within the read-only (!canUpdateTicket) panel below, Customer Admin/User
    // can still add comments and files (they have appendTicketDescription).
    // Any other role landing on this panel - currently only SCX Management,
    // via its read-only Tickets access - has no such right, so the Add
    // Comments box is hidden rather than shown and then rejected by the server.
    const canComment = currentUser.role === roles.CUSTOMER_ADMIN || currentUser.role === roles.CUSTOMER_USER
    const descriptionRef = React.useRef(null)
    const vendorDescriptionRef = React.useRef(null)

    // Hoisted above the state block below - a few of the new RFO tab's own
    // default values (problemStartDateTime/problemStopDateTime when RFO
    // Request received is "No") are seeded from these.
    const history = _.get(ticket, "history", [])
    const createdAt = _.get(history, "[0].updatedAt", "")
    const problemStartDate = _.get(ticket, "problemStartDate", "") || ""
    const problemStartUsable = WALL_CLOCK.test(problemStartDate)
    const ticketStatus = _.get(ticket, "status")
    // The ticket's saved closing details, shown read-only in the details of a
    // Closed/Completed ticket (customers and SCX alike). Older imported tickets
    // may have no closed date recorded.
    const closedAtText = _.get(ticket, "closedAt") ? getFormattedDate(ticket.closedAt) : "Not recorded"
    const closureCodeText = _.get(ticket, "closureCode") || "Not recorded"
    const closedAtInitial = dateTimeLocalValue(_.get(ticket, "closedAt", ""))

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

    // RFO Request tab - "SCX NOC Users/Admin: EDIT Modify Ticket". Always
    // editable (never locked by ticket status - see saveTicketRfo), so
    // unlike every other tab here these have no *Locked companion.
    const [rfoRequested, setRfoRequested] = React.useState(_.get(ticket, "rfo.requested", "No"))
    const [rfoRequestDate, setRfoRequestDate] = React.useState(_.get(ticket, "rfo.requestDate", ""))
    // Defaulted from Problem Start Date/Ticket Closure Date the same way the
    // redesigned Ticket Closure Details tab's own "requested = No" branch
    // describes, so the two stay pre-filled consistently whichever tab is
    // filled in first - still freely editable either way.
    const [rfoProblemStartDateTime, setRfoProblemStartDateTime] = React.useState(
        _.get(ticket, "rfo.problemStartDateTime", "") || (problemStartUsable ? problemStartDate.slice(0, 16) : "")
    )
    const [rfoProblemStopDateTime, setRfoProblemStopDateTime] = React.useState(
        _.get(ticket, "rfo.problemStopDateTime", "") || closedAtInitial
    )
    const [rfoRequestStatus, setRfoRequestStatus] = React.useState(_.get(ticket, "rfo.status", "Not Received"))
    const [rfoCode, setRfoCode] = React.useState(_.get(ticket, "rfo.code", ""))
    const [rfoDescription, setRfoDescription] = React.useState(_.get(ticket, "rfo.description", ""))

    // Redesigned Ticket Closure Details tab's own editable "Ticket Closure
    // Date/Time" (previously this tab couldn't touch closedAt at all).
    const [closureDateTime, setClosureDateTime] = React.useState(closedAtInitial)
    // "Add Field - Customer Delay/Hold Time - HH:MM" - free-text "H:MM"
    // entry (see parseHHMM above), used below to derive Net/Network Down Time.
    const [customerDelayTime, setCustomerDelayTime] = React.useState(_.get(ticket, "customerDelayTime", ""))

    const [submitting, setSubmitting] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)
    // Customer Communication / Vendor Communication's own fields are only
    // editable from the Open Tickets view - once a ticket has moved to the
    // Closed or Completed tab, only the Ticket Closure details tab may
    // still be touched (and none at all once Completed) - except for SCX
    // Admin, who can still edit these too ("Give rights to SCX Admin to
    // update Ticket for Closed or Completed Ticket also"), mirroring the
    // server's own guard in updateTicket.
    const mainFieldsLocked = mode !== "open" && currentUser.role !== roles.SCLOUDX_ADMIN
    // Adding a new comment/attachment is a separate server-side capability
    // (appendTicketDescription/appendVendorDescription/addTicketAttachments)
    // that stays closed-ticket-blocked for every other role - "Give
    // Permission to SCX Admin to Update/Modify any Field In Delivery And
    // NOC Management irrespective of its status" gives SCX Admin the same
    // exception as mainFieldsLocked above.
    const commentsLocked = mode !== "open" && currentUser.role !== roles.SCLOUDX_ADMIN
    // Ticket Closure details tab - already editable for everyone while
    // Closed; Completed freezes it too, except for SCX Admin, same
    // exception as mainFieldsLocked above.
    const closureFieldsLocked = mode === "completed" && currentUser.role !== roles.SCLOUDX_ADMIN
    // The Status dropdown stays locked once a ticket is Closed/Completed
    // for every other role - the server only ever accepts it unchanged or
    // moving Closed -> Completed for them. SCX Admin gets the same
    // exception as mainFieldsLocked ("As SCX Admin, I still cannot change
    // Status of Closed Ticket") - the server accepts any value from Admin,
    // including reopening the ticket, so tab0StatusOptions' full list
    // (every status, not just Open-mode's subset) is a safe, usable set to
    // offer here.
    const statusFieldLocked = mode !== "open" && currentUser.role !== roles.SCLOUDX_ADMIN
    // The locally selected, not-yet-saved status - drives whether Closure
    // Code appears (Open mode only) the moment "Closed" is picked, ahead of
    // the eventual save.
    const closingNow = status === "Closed"
    // Tab 0's Status field must always include the ticket's actual current
    // value as a MenuItem (even disabled) or MUI renders it blank - Open
    // mode is the only place "Completed" is deliberately left off the list.
    const tab0StatusOptions = mode === "open" ? openStatusOptions : statusOptions

    // "Total downtime calculation is wrong" - Total Down Time is the actual
    // reported outage window, RFO Problem Start -> RFO Problem Stop, not
    // the ticket-level Problem Start Date/Ticket Closure Date/Time (which
    // can differ a lot - Ticket Closure Date/Time is just when the ticket
    // was administratively closed, and Problem Start Date is often only a
    // rough initial guess later refined on the RFO side). rfoProblemStart/
    // StopDateTime already default FROM Problem Start Date/Ticket Closure
    // Date/Time when nothing's been entered yet (see their own useState
    // initializers), so this still reduces to the old formula until either
    // is edited - it just also picks up a more accurate RFO-side correction
    // once one exists, in either the "Yes" or "No" branch. Purely derived
    // from already-tracked state, recomputed on every render rather than
    // stored, so it always reflects the current (possibly not-yet-saved)
    // edits rather than going stale.
    const totalDownTimeMinutes = minutesBetween(rfoProblemStartDateTime, rfoProblemStopDateTime)
    const customerDelayMinutes = parseHHMM(customerDelayTime)
    const netDownTimeMinutes = totalDownTimeMinutes === null ? null : totalDownTimeMinutes - (customerDelayMinutes || 0)
    // Membership in the "Network Issue" category, not a string prefix check -
    // "Network Issue - Latency Packet Loss" was renamed to "Latency/ Packet
    // Loss" (no longer literally starting with "Network Issue"), which had
    // silently broken this.
    const isNetworkIssue = networkIssueRfoCodes.includes(rfoCode)
    const networkDownTimeMinutes = isNetworkIssue ? netDownTimeMinutes : null
    // "In Ticket Closure Details, Save and Close Button should be active
    // when all fields are filled and RFO Code is not Blank/None"
    const closureAllFieldsFilled = Boolean(
        closureDateTime && rfoProblemStartDateTime && rfoProblemStopDateTime && rfoRequestStatus && rfoCode && customerDelayTime
    )
    // "RFO Request -- ... Save and Close Tab should only be there once RFO
    // Status is 'Closed' and RFO Code is not Blank/NONE"
    const rfoCanClose = rfoRequestStatus === "Closed" && Boolean(rfoCode)

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

    // The general ticket edit form (Customer/Vendor Communication) - Open
    // Tickets only for most roles; SCX Admin can also reach this from a
    // Closed/Completed ticket (see mainFieldsLocked). Ticket Closure
    // details has its own handler below.
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
        // Both are wall-clock strings in the same "YYYY-MM-DDTHH:mm" shape, so a
        // plain comparison is time-zone safe. Creation time is not a limit.
        if (closingNow && problemStartUsable && closedAt.slice(0, 16) < problemStartDate.slice(0, 16)) {
            setFeedback({ severity: "error", message: "Closed Date and Time cannot be before the Problem Start Date and Time" })
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
                closedAtLocal: closingNow ? closedAt : undefined,
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

    // Redesigned Ticket Closure Details tab - Closed Tickets tab only.
    // "Give Button at Below - Save and Save and Closed. ... Save and Change
    // Ticket Status as Completed" - forceStatus is only passed by the Save
    // and Closed button below (event is then null, not a form submission);
    // the plain Save button (type="submit", forceStatus undefined) just
    // resaves the ticket's current status as-is.
    const handleClosureSubmit = async (event, forceStatus) => {
        if (event && event.preventDefault) event.preventDefault()
        const nextStatus = forceStatus || status
        setSubmitting(true)
        try {
            await dispatch(updateTicket([{
                ticketId: ticket.id,
                status: nextStatus,
                closedAt: closureDateTime ? new Date(closureDateTime).toISOString() : undefined,
                customerDelayTime,
                // Only meaningful (and only sent editable on this tab) when
                // RFO Request received is "No" - the "Yes" case is a
                // read-only mirror of the RFO Request tab instead; the
                // server itself ignores this when requested is "Yes" too
                // (see ticket.service.js's updateTicket), this just avoids
                // sending stale edits that wouldn't be applied anyway.
                rfo: rfoRequested === "No" ? {
                    problemStartDateTime: rfoProblemStartDateTime,
                    problemStopDateTime: rfoProblemStopDateTime,
                    status: rfoRequestStatus,
                    code: rfoCode,
                } : undefined,
            }])).unwrap()
            setStatus(nextStatus)
            setFeedback({ severity: "success", message: "Ticket updated successfully" })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update ticket" })
        } finally {
            setSubmitting(false)
        }
    }

    // RFO Request tab - its own dedicated endpoint/thunk (saveTicketRfo),
    // not updateTicket, since it must stay editable even once the ticket is
    // Closed/Completed (see ticket.service.js's saveTicketRfo for why).
    // "When Save and Closed is clicked; Save and Change Ticket Status as
    // RFO Closed" - closeNow is only true for that second button.
    const handleSaveRfo = async (closeNow) => {
        setSubmitting(true)
        try {
            await dispatch(saveTicketRfo({
                ticketId: ticket.id,
                requested: rfoRequested,
                requestDate: rfoRequestDate,
                problemStartDateTime: rfoProblemStartDateTime,
                problemStopDateTime: rfoProblemStopDateTime,
                status: rfoRequestStatus,
                code: rfoCode,
                description: rfoDescription,
                closeNow,
            })).unwrap()
            setFeedback({ severity: "success", message: closeNow ? "RFO Request saved - ticket status set to RFO Closed" : "RFO Request saved" })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to save RFO Request" })
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
                        {ticketDone && (
                            <>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Closed Date and Time" value={closedAtText} disabled />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Closure Code" value={closureCodeText} disabled />
                                </Grid>
                            </>
                        )}

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
                        ) : !canComment ? (
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                    You have view-only access to this ticket.
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

                <Tabs
                    value={activeTab}
                    onChange={(event, newValue) => {
                        setActiveTab(newValue)
                        // "if i change status to Closed but do not save,
                        // change to other tab, it immediately blocks
                        // Customer Communication" - status/closedAt/
                        // closureCode are shared state across every tab's
                        // Save (handleSubmit always sends the whole
                        // ticket), so a picked-but-unsaved "Closed" lingers
                        // and makes Vendor Communication's own Save (or
                        // coming back to this tab) demand a Closure Code
                        // for a close nobody asked for right now. Leaving
                        // the tab without saving discards that in-progress
                        // close, back to the ticket's real saved values -
                        // an intentional close has to be completed without
                        // switching tabs in between.
                        setStatus(_.get(ticket, "status", "Submitted"))
                        setClosedAt("")
                        setClosureCode(_.get(ticket, "closureCode", ""))
                    }}
                    sx={{ mb: 2 }}
                >
                    <Tab label="Customer Communication" />
                    <Tab label="Vendor Communication" />
                    {/* "After Vendor Communication, Tab 'RFO Request' Editable
                        even in Closed and Completed status" - unlike every
                        other tab here, always shown/editable regardless of
                        mode. */}
                    <Tab label="RFO Request" />
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
                                    <TextField
                                        fullWidth
                                        label="Problem Start Date and Time"
                                        value={problemStartUsable ? getFormattedDate(problemStartDate) : (problemStartDate || "Not provided")}
                                        disabled
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth required disabled={statusFieldLocked}>
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
                                {mode !== "open" && (
                                    <>
                                        {/* Closed / Completed ticket: its saved closing details, read-only,
                                            laid out like the closing inputs below (spacer, then Closed
                                            Date and Time, then Closure Code under Status). */}
                                        <Grid item xs={false} sm={4} sx={{ display: { xs: "none", sm: "block" } }} />
                                        <Grid item xs={12} sm={4}>
                                            <TextField fullWidth label="Closed Date and Time" value={closedAtText} disabled />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField fullWidth label="Closure Code" value={closureCodeText} disabled />
                                        </Grid>
                                    </>
                                )}
                                {mode === "open" && closingNow && (
                                    <>
                                        {/* A spacer plus Closed Date and Time push Closure Code into
                                            the same column as Status directly above it (Priority/
                                            Problem Start Date/Status fill the row above, 3 x sm4). */}
                                        <Grid item xs={false} sm={4} sx={{ display: { xs: "none", sm: "block" } }} />
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                required
                                                type="datetime-local"
                                                label="Closed Date and Time"
                                                InputLabelProps={{ shrink: true }}
                                                inputProps={{ min: problemStartUsable ? problemStartDate.slice(0, 16) : undefined }}
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

                                {commentsLocked ? (
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

                                {commentsLocked ? (
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

                {activeTab === 2 && (
                    <Box>
                        <Grid container spacing={2}>
                            {/* "Realign various fields, Display Below RFO
                                Received (yes/No)" - full width on its own
                                row so the rest of the fields always wrap
                                onto new rows below it, not beside it. */}
                            <Grid item xs={12}>
                                <FormControl>
                                    <FormLabel id="rfo-requested-label">RFO Request received</FormLabel>
                                    <RadioGroup
                                        row
                                        aria-labelledby="rfo-requested-label"
                                        value={rfoRequested}
                                        onChange={(event) => {
                                            setRfoRequested(event.target.value)
                                            // "RFO Request - Once RFO Request is changed Yes,
                                            // change its default status as 'Received' ... and
                                            // again default to 'Not received' if toggled to
                                            // 'No'" - still freely editable afterward via its
                                            // own dropdown either way.
                                            setRfoRequestStatus(event.target.value === "Yes" ? "Received" : "Not Received")
                                        }}
                                    >
                                        <FormControlLabel value="No" control={<Radio />} label="No" />
                                        <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
                                    </RadioGroup>
                                </FormControl>
                            </Grid>
                            {/* "If Changed to Yes, Rest of fields visible to fill" */}
                            {rfoRequested === "Yes" && (
                                <>
                                    <Grid item xs={12} sm={4}>
                                        <TextField
                                            fullWidth
                                            type="datetime-local"
                                            label="RFO Request Date (IST)"
                                            InputLabelProps={{ shrink: true }}
                                            value={rfoRequestDate}
                                            onChange={(event) => setRfoRequestDate(event.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <TextField
                                            fullWidth
                                            type="datetime-local"
                                            label="RFO Problem Start Date/Time (GMT)"
                                            InputLabelProps={{ shrink: true }}
                                            value={rfoProblemStartDateTime}
                                            onChange={(event) => setRfoProblemStartDateTime(event.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <TextField
                                            fullWidth
                                            type="datetime-local"
                                            label="RFO Problem Stop Date/Time (GMT)"
                                            InputLabelProps={{ shrink: true }}
                                            value={rfoProblemStopDateTime}
                                            onChange={(event) => setRfoProblemStopDateTime(event.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <FormControl fullWidth>
                                            <InputLabel id="rfo-request-status-label">RFO Status</InputLabel>
                                            <Select
                                                labelId="rfo-request-status-label"
                                                value={rfoRequestStatus}
                                                label="RFO Status"
                                                onChange={(event) => setRfoRequestStatus(event.target.value)}
                                            >
                                                {rfoRequestStatusOptions.map((option) => (
                                                    <MenuItem key={option} value={option}>{option}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <FormControl fullWidth>
                                            <InputLabel id="rfo-code-label">RFO Code</InputLabel>
                                            <Select
                                                labelId="rfo-code-label"
                                                value={rfoCode}
                                                label="RFO Code"
                                                onChange={(event) => setRfoCode(event.target.value)}
                                            >
                                                <MenuItem value=""><em>None</em></MenuItem>
                                                {rfoCodeOptions.map((option) => (
                                                    <MenuItem key={option} value={option}>{option}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            minRows={3}
                                            label="RFO Description"
                                            value={rfoDescription}
                                            onChange={(event) => setRfoDescription(event.target.value)}
                                        />
                                    </Grid>
                                </>
                            )}
                            <Grid item xs={12}>
                                <Button variant="contained" disabled={submitting} onClick={() => handleSaveRfo(false)}>
                                    {submitting ? "Saving..." : "Save"}
                                </Button>
                                {/* "Save and Close Tab should only be there
                                    once RFO Status is 'Closed' and RFO Code
                                    is not Blank/NONE" */}
                                {rfoCanClose && (
                                    <Button variant="outlined" sx={{ ml: 1 }} disabled={submitting} onClick={() => handleSaveRfo(true)}>
                                        Save and Closed
                                    </Button>
                                )}
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {activeTab === 3 && mode !== "open" && (
                    <Box component="form" noValidate onSubmit={handleClosureSubmit}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Ticket Create Date/Time" value={createdAt ? getFormattedDate(createdAt) : ""} disabled />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Problem Start Date/Time"
                                    value={problemStartUsable ? getFormattedDate(problemStartDate) : (problemStartDate || "Not provided")}
                                    disabled
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    required
                                    type="datetime-local"
                                    label="Ticket Closure Date/Time"
                                    InputLabelProps={{ shrink: true }}
                                    value={closureDateTime}
                                    onChange={(event) => setClosureDateTime(event.target.value)}
                                    disabled={closureFieldsLocked}
                                />
                            </Grid>

                            {/* "Ticket Closure Details, Display fields in
                                following order ... RFO Request received =
                                Yes/No indicator at top, RFO Request Date,
                                RFO Problem Start/Stop Date/Time, RFO Status,
                                RFO Code, RFO Description" - the full RFO
                                record, ahead of Customer Delay/downtime below
                                (see "Display all fields of Ticket closure
                                Details" - always visible here regardless of
                                Yes/No, not just the subset that varies). */}
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                                    RFO Request received = {rfoRequested}
                                    {rfoRequested === "Yes" ? " - shown below as entered on the RFO Request tab (read-only here)" : ""}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="RFO Request Date (IST)" value={rfoRequestDate ? getFormattedDate(rfoRequestDate) : "Not requested"} disabled />
                            </Grid>
                            {rfoRequested === "Yes" ? (
                                <>
                                    {/* "RFO Problem Start/Stop Date/Time IST
                                        (Converted from GMT if captured in GMT
                                        in RFO Tab)" - the RFO Request tab
                                        captures these as GMT (see its own
                                        "(GMT)" labels); converted here since
                                        this read-only mirror is what most
                                        other readers of this tab actually
                                        need. */}
                                    <Grid item xs={12} sm={4}>
                                        <TextField fullWidth label="RFO Problem Start Date/Time (IST)" value={formatGmtWallClockAsIst(rfoProblemStartDateTime)} disabled />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <TextField fullWidth label="RFO Problem Stop Date/Time (IST)" value={formatGmtWallClockAsIst(rfoProblemStopDateTime)} disabled />
                                    </Grid>
                                    {/* "Align all fields as were aligned when RFO Request
                                        received = No" - same RFO Code/RFO Status/Customer
                                        Delay/Hold Time order as the "No" branch below, just
                                        read-only here instead of editable. */}
                                    <Grid item xs={12} sm={4}>
                                        <TextField fullWidth label="RFO Code" value={rfoCode} disabled />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <TextField fullWidth label="RFO Status" value={rfoRequestStatus} disabled />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <TextField
                                            fullWidth
                                            required
                                            label="Customer Delay/Hold Time"
                                            placeholder="HH:MM"
                                            value={customerDelayTime}
                                            onChange={(event) => setCustomerDelayTime(event.target.value)}
                                            disabled={closureFieldsLocked}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={8}>
                                        <TextField fullWidth multiline minRows={2} label="RFO Description" value={rfoDescription} disabled />
                                    </Grid>
                                </>
                            ) : (
                                <>
                                    {/* "RFO Request received = No; Display Below In Edit
                                        Mode" - defaulted to Problem Start Date/Time and
                                        Ticket Closure Date/Time respectively (see this
                                        component's own rfoProblemStartDateTime/
                                        rfoProblemStopDateTime state), still freely editable.
                                        Captured directly here (not on the RFO Request tab),
                                        same GMT convention as Problem Start Date - no IST
                                        conversion, unlike the read-only "Yes" branch above.
                                        RFO Status/Description aren't part of the "No"
                                        edit fields (there's no RFO to report a status or
                                        description on), but still shown read-only so every
                                        field on this record stays visible either way. */}
                                    <Grid item xs={12} sm={4}>
                                        <TextField
                                            fullWidth
                                            type="datetime-local"
                                            label="RFO Problem Start Date/Time"
                                            InputLabelProps={{ shrink: true }}
                                            value={rfoProblemStartDateTime}
                                            onChange={(event) => setRfoProblemStartDateTime(event.target.value)}
                                            disabled={closureFieldsLocked}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <TextField
                                            fullWidth
                                            type="datetime-local"
                                            label="RFO Problem Stop Date/Time"
                                            InputLabelProps={{ shrink: true }}
                                            value={rfoProblemStopDateTime}
                                            onChange={(event) => setRfoProblemStopDateTime(event.target.value)}
                                            disabled={closureFieldsLocked}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <FormControl fullWidth disabled={closureFieldsLocked}>
                                            <InputLabel id="closure-rfo-code-label">RFO Code</InputLabel>
                                            <Select
                                                labelId="closure-rfo-code-label"
                                                value={rfoCode}
                                                label="RFO Code"
                                                onChange={(event) => setRfoCode(event.target.value)}
                                            >
                                                <MenuItem value=""><em>None</em></MenuItem>
                                                {rfoCodeOptions.map((option) => (
                                                    <MenuItem key={option} value={option}>{option}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <TextField fullWidth label="RFO Status" value={rfoRequestStatus} disabled />
                                    </Grid>
                                    {/* "Align Customer Delay Hold Time next to RFO Status
                                        field" / "if RFO Request received = Yes, Align all
                                        fields as were aligned when RFO Request received =
                                        No" - RFO Code, RFO Status, Customer Delay/Hold Time
                                        in that same order in both branches (see the "Yes"
                                        branch above, which mirrors this one field-for-field
                                        now, just read-only instead of editable). */}
                                    <Grid item xs={12} sm={4}>
                                        <TextField
                                            fullWidth
                                            required
                                            label="Customer Delay/Hold Time"
                                            placeholder="HH:MM"
                                            value={customerDelayTime}
                                            onChange={(event) => setCustomerDelayTime(event.target.value)}
                                            disabled={closureFieldsLocked}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={8}>
                                        <TextField fullWidth multiline minRows={2} label="RFO Description" value={rfoDescription} disabled />
                                    </Grid>
                                </>
                            )}

                            {/* "Align Total Downtime; Effective Down Time;
                                Network Downtime in one line ... Below RFO
                                Details" - a full-width spacer forces these
                                three onto their own fresh row regardless of
                                how much of the RFO block's own last row (RFO
                                Description, sm=8) the grid packing above
                                happened to leave open - otherwise the first
                                of the three could end up sharing that row
                                instead of starting a new one below it. */}
                            <Grid item xs={12} />

                            {/* "Add Fields - Total Down Time (HH:MM) = (Ticket
                                Closure Time - Problem Start Time), Effective
                                Down Time (HH:MM) [renamed from Net Down Time]
                                = Downtime minus Customer Delay/Hold Time
                                (HH:MM), Network Downtime (HH:MM) = Effective
                                Down Time If RFO Code contains Network Issue" -
                                all three calculated (see this component's own
                                totalDownTimeMinutes/netDownTimeMinutes/
                                networkDownTimeMinutes), so always read-only
                                and never saved on their own. */}
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Total Down Time (HH:MM)" value={formatMinutesToHHMM(totalDownTimeMinutes)} disabled />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Effective Down Time (HH:MM)" value={formatMinutesToHHMM(netDownTimeMinutes)} disabled />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Network Downtime (HH:MM)" value={formatMinutesToHHMM(networkDownTimeMinutes)} disabled />
                            </Grid>

                            {!closureFieldsLocked && (
                                <Grid item xs={12}>
                                    <Button type="submit" variant="contained" disabled={submitting}>
                                        {submitting ? "Saving..." : "Save"}
                                    </Button>
                                    {/* "Give Button at Below - Save and Save and Closed.
                                        When Save and Closed is clicked; Save and Change
                                        Ticket Status as Completed" - only offered from
                                        Closed (mode "completed" has no further status to
                                        move to; Admin can still use plain Save there to
                                        amend the RFO/closure record). */}
                                    {/* "Save and Close Button should be active
                                        when all fields are filled and RFO Code
                                        is not Blank/None" */}
                                    {mode === "closed" && (
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            sx={{ ml: 1 }}
                                            disabled={submitting || !closureAllFieldsFilled}
                                            onClick={(event) => handleClosureSubmit(event, "Completed")}
                                        >
                                            Save and Closed
                                        </Button>
                                    )}
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                )}
            </Paper>

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
