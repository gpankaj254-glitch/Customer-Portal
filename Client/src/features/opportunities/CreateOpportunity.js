import * as React from "react"
import Button from "@mui/material/Button"
import CssBaseline from "@mui/material/CssBaseline"
import TextField from "@mui/material/TextField"
import Grid from "@mui/material/Grid"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Container from "@mui/material/Container"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import FormControl from "@mui/material/FormControl"
import FormHelperText from "@mui/material/FormHelperText"
import Select from "@mui/material/Select"
import PropTypes from "prop-types"
import { useDispatch, useSelector } from "react-redux"
import { createOpportunity, getOpportunities, selectPagination } from "./opportunitySlice"
import { selectCustomerList } from "../customers/customerSlice"

export default function CreateOpportunity({ onCreated }) {
    const dispatch = useDispatch()
    const pagination = useSelector(selectPagination)
    const customerList = useSelector(selectCustomerList)
    const [feedback, setFeedback] = React.useState(null)
    const [selectedCustomer, setSelectedCustomer] = React.useState("")

    const handleSubmit = async (event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        const payload = {
            name: data.get("name"),
            customerId: selectedCustomer || undefined,
            prospectName: selectedCustomer ? "" : data.get("prospectName"),
            description: data.get("description"),
        }
        try {
            const created = await dispatch(createOpportunity(payload)).unwrap()
            setFeedback({ severity: "success", message: "Opportunity created successfully" })
            form.reset()
            setSelectedCustomer("")
            dispatch(getOpportunities({ limit: pagination.limit, page: pagination.page + 1 }))
            // Jump to the list and expand the new row so its Customer/Supplier
            // Communication tabs are immediately visible - those tabs live on
            // the list row (a repeatable list needs the opportunity to exist
            // first), not on this create form, which isn't obvious otherwise.
            if (onCreated) onCreated(created.id)
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to create opportunity" })
        }
    }

    return (
        <Container component="main" maxWidth="md">
            <CssBaseline />
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography component="h1" variant="h5">Create New Opportunity</Typography>

                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                autoComplete="off"
                                name="name"
                                required
                                fullWidth
                                id="opportunityName"
                                label="Opportunity Name"
                                autoFocus
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel id="customer-select-label">Existing Customer</InputLabel>
                                <Select
                                    labelId="customer-select-label"
                                    id="customer"
                                    value={selectedCustomer}
                                    label="Existing Customer"
                                    onChange={(event) => setSelectedCustomer(event.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {customerList.map((row) => (
                                        <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>Leave blank for a prospect that isn&apos;t a customer yet</FormHelperText>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                name="prospectName"
                                label="Prospect Name"
                                disabled={!!selectedCustomer}
                                helperText={selectedCustomer ? "Using selected customer" : ""}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                name="description"
                                label="Description"
                                id="description"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                                Create Opportunity
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Box>

            <Snackbar
                open={!!feedback}
                autoHideDuration={4000}
                onClose={() => setFeedback(null)}
            >
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Container>
    )
}

CreateOpportunity.propTypes = {
    onCreated: PropTypes.func,
}

CreateOpportunity.defaultProps = {
    onCreated: null,
}
