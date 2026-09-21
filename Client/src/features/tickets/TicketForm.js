import * as React from "react"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Grid from "@mui/material/Grid"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import FormControl from "@mui/material/FormControl"
import Select from "@mui/material/Select"
import Checkbox from "@mui/material/Checkbox"
import FormControlLabel from "@mui/material/FormControlLabel"
import RadioGroup from "@mui/material/RadioGroup"
import Radio from "@mui/material/Radio"
import Paper from "@mui/material/Paper"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import PropTypes from "prop-types"
import _ from "lodash"
import { useDispatch } from "react-redux"
import { createTicket } from "./ticketSlice"
import { problemTypeOptions, priorityOptions, siteAccessHoursOptions } from "../../consts/ticketOptions"

export default function TicketForm({ circuit, onDone, onBack }) {
    const dispatch = useDispatch()

    const [problemType, setProblemType] = React.useState("")
    const [otherProblemDetails, setOtherProblemDetails] = React.useState("")
    const [problemStartDate, setProblemStartDate] = React.useState("")
    const [customerReference, setCustomerReference] = React.useState("")
    const [priority, setPriority] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [powerAvailable, setPowerAvailable] = React.useState(false)
    const [physicalConnectionCheck, setPhysicalConnectionCheck] = React.useState(false)
    const [siteAccessHours, setSiteAccessHours] = React.useState("")
    const [siteAccessHoursOtherText, setSiteAccessHoursOtherText] = React.useState("")
    const [feedback, setFeedback] = React.useState(null)
    const [submitting, setSubmitting] = React.useState(false)

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (!problemType) {
            setFeedback({ severity: "error", message: "Please select a problem type" })
            return
        }
        if (!priority) {
            setFeedback({ severity: "error", message: "Please select a priority" })
            return
        }
        if (!description) {
            setFeedback({ severity: "error", message: "Please enter a description" })
            return
        }

        const payload = {
            circuitId: circuit.id,
            problemType,
            otherProblemDetails: problemType === "Other" ? otherProblemDetails : "",
            problemStartDate,
            customerReference,
            priority,
            description,
            siteChecklist: {
                powerAvailable,
                physicalConnectionCheck,
                siteAccessHours,
                siteAccessHoursOtherText: siteAccessHours === "Other" ? siteAccessHoursOtherText : "",
            },
        }

        setSubmitting(true)
        try {
            await dispatch(createTicket([payload])).unwrap()
            setFeedback({ severity: "success", message: "Ticket created successfully" })
            onDone()
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to create ticket" })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h5">Create Ticket</Typography>
                <Button onClick={onBack}>Back to Inventory</Button>
            </Box>
            <Box component="form" noValidate onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Customer Name" value={_.get(circuit, "customer.name", "")} disabled />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Circuit Name" value={circuit.customerCircuitId || circuit.vendorCircuitId || circuit.code} disabled />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Site Name" value={_.get(circuit, "site.name", "")} disabled />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                            <InputLabel id="problem-type-label">Problem Type</InputLabel>
                            <Select
                                labelId="problem-type-label"
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
                    {problemType === "Other" && (
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                label="Additional Details"
                                placeholder="Describe the problem"
                                value={otherProblemDetails}
                                onChange={(event) => setOtherProblemDetails(event.target.value)}
                            />
                        </Grid>
                    )}
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            type="datetime-local"
                            label="Problem Start Date and Time"
                            InputLabelProps={{ shrink: true }}
                            value={problemStartDate}
                            onChange={(event) => setProblemStartDate(event.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Customer Reference"
                            value={customerReference}
                            onChange={(event) => setCustomerReference(event.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                            <InputLabel id="priority-label">Priority</InputLabel>
                            <Select
                                labelId="priority-label"
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
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            required
                            multiline
                            minRows={3}
                            label="Description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>Site Checklist</Typography>
                        <FormControlLabel
                            control={<Checkbox checked={powerAvailable} onChange={(event) => setPowerAvailable(event.target.checked)} />}
                            label="Power Available"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={physicalConnectionCheck} onChange={(event) => setPhysicalConnectionCheck(event.target.checked)} />}
                            label="Physical Connection Check"
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Site Access Hours</Typography>
                        <RadioGroup
                            row
                            value={siteAccessHours}
                            onChange={(event) => setSiteAccessHours(event.target.value)}
                        >
                            {siteAccessHoursOptions.map((option) => (
                                <FormControlLabel key={option} value={option} control={<Radio />} label={option} />
                            ))}
                        </RadioGroup>
                        {siteAccessHours === "Other" && (
                            <TextField
                                fullWidth
                                label="Other"
                                value={siteAccessHoursOtherText}
                                onChange={(event) => setSiteAccessHoursOtherText(event.target.value)}
                                sx={{ mt: 1 }}
                            />
                        )}
                    </Grid>
                    <Grid item xs={12}>
                        <Button type="submit" variant="contained" disabled={submitting}>
                            {submitting ? "Creating..." : "Create Ticket"}
                        </Button>
                    </Grid>
                </Grid>
            </Box>
            <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Paper>
    )
}

TicketForm.propTypes = {
    circuit: PropTypes.object.isRequired,
    onDone: PropTypes.func.isRequired,
    onBack: PropTypes.func.isRequired,
}
