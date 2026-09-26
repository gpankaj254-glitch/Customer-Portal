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
import Divider from "@mui/material/Divider"
import Autocomplete from "@mui/material/Autocomplete"
import PropTypes from "prop-types"
import { useDispatch, useSelector } from "react-redux"
import { createOpportunity, getOpportunities, selectPagination } from "./opportunitySlice"
import { selectCustomerList } from "../customers/customerSlice"
import { useCircuitFieldOptions } from "../inventory/circuitActions"
import {
    linkTypeOptions,
    ipRequirementOptions,
    interfaceOptions,
} from "../../consts/opportunityCommOptions"
import { countryOptions } from "../../consts/countryOptions"

export default function CreateOpportunity({ onCreated }) {
    const dispatch = useDispatch()
    const pagination = useSelector(selectPagination)
    const customerList = useSelector(selectCustomerList)
    // "Create Product Management Function for SCX Admin ... these values
    // should be visible in various dropdown menus" - Product/Bandwidth
    // dropdowns below now read the merged (static + admin-added) list.
    const { productOptions, bandwidthOptions } = useCircuitFieldOptions()
    const [feedback, setFeedback] = React.useState(null)
    const [selectedCustomer, setSelectedCustomer] = React.useState("")
    const [linkType, setLinkType] = React.useState("")
    const [country, setCountry] = React.useState("")
    const [product, setProduct] = React.useState("")
    const [ipRequirement, setIpRequirement] = React.useState("")
    const [interfaceType, setInterfaceType] = React.useState("")
    const [downBandwidth, setDownBandwidth] = React.useState("")
    const [upBandwidth, setUpBandwidth] = React.useState("")

    const handleSubmit = async (event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        const payload = {
            name: data.get("name"),
            customerId: selectedCustomer || undefined,
            prospectName: selectedCustomer ? "" : data.get("prospectName"),
            description: data.get("description"),
            customerRequest: {
                requestId: data.get("requestId"),
                requestDate: data.get("requestDate"),
                linkType,
                siteAddress: data.get("siteAddress"),
                city: data.get("city"),
                state: data.get("state"),
                zipCode: data.get("zipCode"),
                country,
                product,
                ipRequirement,
                interface: interfaceType,
                downBandwidth,
                upBandwidth,
                contractTerm: data.get("contractTerm"),
            },
        }
        try {
            const created = await dispatch(createOpportunity(payload)).unwrap()
            setFeedback({ severity: "success", message: "Opportunity created successfully" })
            form.reset()
            setSelectedCustomer("")
            setLinkType("")
            setCountry("")
            setProduct("")
            setIpRequirement("")
            setInterfaceType("")
            setDownBandwidth("")
            setUpBandwidth("")
            dispatch(getOpportunities({ limit: pagination.limit, page: pagination.page + 1 }))
            // Jump to the list and expand the new row so its Supplier
            // Communication tab is immediately visible - it lives on the
            // list row (a repeatable list needs the opportunity to exist
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
                <Typography component="h1" variant="h6">Create New Opportunity</Typography>

                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2, width: "100%" }}>
                    <Grid container spacing={1.5}>
                        <Grid item xs={12}>
                            <TextField
                                autoComplete="off"
                                name="name"
                                required
                                fullWidth
                                size="small"
                                id="opportunityName"
                                label="Opportunity Name"
                                autoFocus
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
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
                                size="small"
                                name="prospectName"
                                label="Prospect Name"
                                disabled={!!selectedCustomer}
                                helperText={selectedCustomer ? "Using selected customer" : ""}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                size="small"
                                multiline
                                minRows={2}
                                name="description"
                                label="Description"
                                id="description"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2">Customer Request</Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" name="requestId" label="Request ID" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                name="requestDate"
                                label="Request Date"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="linkType-label">Link Type</InputLabel>
                                <Select
                                    labelId="linkType-label"
                                    value={linkType}
                                    label="Link Type"
                                    onChange={(event) => setLinkType(event.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {linkTypeOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" name="siteAddress" label="Site Address" />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" name="city" label="City" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" name="state" label="State" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" name="zipCode" label="ZIP Code" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                fullWidth
                                size="small"
                                options={countryOptions}
                                value={country || null}
                                onChange={(event, newValue) => setCountry(newValue || "")}
                                renderInput={(params) => <TextField {...params} label="Country" />}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="product-label">Product</InputLabel>
                                <Select
                                    labelId="product-label"
                                    value={product}
                                    label="Product"
                                    onChange={(event) => setProduct(event.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {productOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="ipRequirement-label">IP Requirement</InputLabel>
                                <Select
                                    labelId="ipRequirement-label"
                                    value={ipRequirement}
                                    label="IP Requirement"
                                    onChange={(event) => setIpRequirement(event.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {ipRequirementOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="interface-label">Interface</InputLabel>
                                <Select
                                    labelId="interface-label"
                                    value={interfaceType}
                                    label="Interface"
                                    onChange={(event) => setInterfaceType(event.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {interfaceOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="downBandwidth-label">Down Bandwidth</InputLabel>
                                <Select
                                    labelId="downBandwidth-label"
                                    value={downBandwidth}
                                    label="Down Bandwidth"
                                    onChange={(event) => setDownBandwidth(event.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {bandwidthOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="upBandwidth-label">Up Bandwidth</InputLabel>
                                <Select
                                    labelId="upBandwidth-label"
                                    value={upBandwidth}
                                    label="Up Bandwidth"
                                    onChange={(event) => setUpBandwidth(event.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {bandwidthOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" name="contractTerm" label="Contract Term" placeholder="e.g. 12 Months" />
                        </Grid>

                        <Grid item xs={12}>
                            <Button type="submit" fullWidth variant="contained" sx={{ mt: 2, mb: 2 }}>
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
