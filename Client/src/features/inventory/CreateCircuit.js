import * as React from "react"
import Button from "@mui/material/Button"
import CssBaseline from "@mui/material/CssBaseline"
import TextField from "@mui/material/TextField"
import Grid from "@mui/material/Grid"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Container from "@mui/material/Container"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import FormControl from "@mui/material/FormControl"
import Select from "@mui/material/Select"
import Autocomplete from "@mui/material/Autocomplete"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import { useDispatch, useSelector } from "react-redux"
import _ from "lodash"
import moment from "moment"
import { createCircuit } from "./circuitSlice"
import { getSites, selectSiteList, selectPagination } from "./inventorySlice"
import { selectVendorList } from "../vendors/vendorSlice"
import { useCircuitFieldOptions } from "./circuitActions"

const BILL_START_DATE_FORMAT = "DD-MM-YYYY"
const DATE_INPUT_FORMAT = "YYYY-MM-DD"

function isValidBillStartDate(value) {
    if (!value) return true
    return moment(value, BILL_START_DATE_FORMAT, true).isValid()
}

// Bill start dates are stored/submitted as dd-mm-yyyy (matching the rest of
// the app - table display, edit dialog, CSV bulk upload) but the native
// <input type="date"> calendar requires yyyy-mm-dd, so convert at the edges.
function toDateInputValue(value) {
    const parsed = moment(value, BILL_START_DATE_FORMAT, true)
    return parsed.isValid() ? parsed.format(DATE_INPUT_FORMAT) : ""
}

function fromDateInputValue(value) {
    const parsed = moment(value, DATE_INPUT_FORMAT, true)
    return parsed.isValid() ? parsed.format(BILL_START_DATE_FORMAT) : ""
}

const initialFormValues = {
    customerCircuitId: "",
    vendorCircuitId: "",
    scloudxOrderReference: "",
    vendorOrderReference: "",
    customerOrderReference: "",
    vendorLECName: "",
    bandwidth: "",
    product: "",
    vendorUptime: "",
    vendorMTTR: "",
    customerCircuitBillStartDate: "",
    customerCircuitContractTerm: "",
    vendorCircuitBillStartDate: "",
    vendorCircuitContractTerm: "",
}

export default function CreateCircuit() {
    const dispatch = useDispatch()
    const siteList = useSelector(selectSiteList)
    const vendorList = useSelector(selectVendorList)
    const pagination = useSelector(selectPagination)
    const { productOptions, bandwidthOptions } = useCircuitFieldOptions()

    const [selectedCustomerId, setSelectedCustomerId] = React.useState("")
    const [selectedSite, setSelectedSite] = React.useState(null)
    const [selectedVendor, setSelectedVendor] = React.useState(null)
    const [values, setValues] = React.useState(initialFormValues)
    const [feedback, setFeedback] = React.useState(null)

    // Vendor-derived fields (LEC name, uptime, MTTR) default from the
    // selected vendor but stay editable - once the user types their own
    // value we stop overwriting it if they pick a different vendor.
    const [vendorLECTouched, setVendorLECTouched] = React.useState(false)
    const [vendorUptimeTouched, setVendorUptimeTouched] = React.useState(false)
    const [vendorMTTRTouched, setVendorMTTRTouched] = React.useState(false)

    const customerOptions = React.useMemo(() => {
        const byId = new Map()
        siteList.forEach((site) => {
            const customer = _.get(site, "customer")
            if (customer && customer.id && !byId.has(customer.id)) {
                byId.set(customer.id, customer)
            }
        })
        return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
    }, [siteList])

    const siteOptions = React.useMemo(() => {
        if (!selectedCustomerId) return []
        return siteList.filter((site) => _.get(site, "customer.id") === selectedCustomerId)
    }, [siteList, selectedCustomerId])

    const vendorOptions = React.useMemo(() => {
        return vendorList.slice().sort((a, b) => a.name.localeCompare(b.name))
    }, [vendorList])

    const handleCustomerChange = (event) => {
        setSelectedCustomerId(event.target.value)
        setSelectedSite(null)
    }

    const handleVendorChange = (event, newVendor) => {
        setSelectedVendor(newVendor)
        setValues((prev) => ({
            ...prev,
            vendorLECName: vendorLECTouched ? prev.vendorLECName : _.get(newVendor, "name", ""),
            vendorUptime: vendorUptimeTouched ? prev.vendorUptime : _.get(newVendor, "vendorUptime", ""),
            vendorMTTR: vendorMTTRTouched ? prev.vendorMTTR : _.get(newVendor, "vendorMTTR", ""),
        }))
    }

    const handleFieldChange = (name, touchedSetter) => (event) => {
        if (touchedSetter) touchedSetter(true)
        setValues((prev) => ({ ...prev, [name]: event.target.value }))
    }

    const handleDateFieldChange = (name) => (event) => {
        setValues((prev) => ({ ...prev, [name]: fromDateInputValue(event.target.value) }))
    }

    const dateError = (name) => {
        return Boolean(values[name]) && !isValidBillStartDate(values[name])
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (!selectedSite) {
            setFeedback({ severity: "error", message: "Please select a site" })
            return
        }
        if (!selectedVendor) {
            setFeedback({ severity: "error", message: "Please select a vendor" })
            return
        }
        if (!values.scloudxOrderReference) {
            setFeedback({ severity: "error", message: "SCloudX Order Reference is required" })
            return
        }
        if (!values.vendorLECName) {
            setFeedback({ severity: "error", message: "Vendor LEC Name is required" })
            return
        }
        if (dateError("customerCircuitBillStartDate") || dateError("vendorCircuitBillStartDate")) {
            setFeedback({ severity: "error", message: "Bill start dates must be in dd-mm-yyyy format" })
            return
        }

        const payload = {
            siteId: selectedSite.id,
            vendorId: selectedVendor.id,
            ...values,
        }

        try {
            await dispatch(createCircuit(payload)).unwrap()
            setFeedback({ severity: "success", message: "Circuit created successfully" })
            setSelectedCustomerId("")
            setSelectedSite(null)
            setSelectedVendor(null)
            setValues(initialFormValues)
            setVendorLECTouched(false)
            setVendorUptimeTouched(false)
            setVendorMTTRTouched(false)
            dispatch(getSites({ limit: pagination.limit, page: pagination.page + 1 }))
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to create circuit" })
        }
    }

    return (
        <Container component="main" maxWidth="md">
            <CssBaseline />
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography component="h1" variant="h5">Create New Circuit</Typography>

                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3, width: "100%" }}>
                    <Grid container spacing={2} justifyContent="center">
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth required>
                                <InputLabel id="customer-select-label">Customer</InputLabel>
                                <Select
                                    labelId="customer-select-label"
                                    value={selectedCustomerId}
                                    label="Customer"
                                    onChange={handleCustomerChange}
                                >
                                    {customerOptions.map((customer) => (
                                        <MenuItem key={customer.id} value={customer.id}>{customer.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Autocomplete
                                options={siteOptions}
                                getOptionLabel={(site) => _.get(site, "name", "")}
                                value={selectedSite}
                                onChange={(event, newSite) => setSelectedSite(newSite)}
                                disabled={!selectedCustomerId}
                                renderInput={(params) => (
                                    <TextField {...params} label="Site" required placeholder="Search sites" />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Autocomplete
                                options={vendorOptions}
                                getOptionLabel={(vendor) => _.get(vendor, "name", "")}
                                value={selectedVendor}
                                onChange={handleVendorChange}
                                renderInput={(params) => (
                                    <TextField {...params} label="Vendor" required placeholder="Search vendors" />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                label="SCloudX Order Reference"
                                value={values.scloudxOrderReference}
                                onChange={handleFieldChange("scloudxOrderReference")}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                label="Vendor LEC Name"
                                value={values.vendorLECName}
                                onChange={handleFieldChange("vendorLECName", setVendorLECTouched)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Customer Order Reference"
                                value={values.customerOrderReference}
                                onChange={handleFieldChange("customerOrderReference")}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Vendor Order Reference"
                                value={values.vendorOrderReference}
                                onChange={handleFieldChange("vendorOrderReference")}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Vendor Circuit ID"
                                value={values.vendorCircuitId}
                                onChange={handleFieldChange("vendorCircuitId")}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Customer Circuit ID"
                                value={values.customerCircuitId}
                                onChange={handleFieldChange("customerCircuitId")}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth>
                                <InputLabel id="bandwidth-select-label">Bandwidth</InputLabel>
                                <Select
                                    labelId="bandwidth-select-label"
                                    value={values.bandwidth}
                                    label="Bandwidth"
                                    onChange={handleFieldChange("bandwidth")}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {bandwidthOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth>
                                <InputLabel id="product-select-label">Product</InputLabel>
                                <Select
                                    labelId="product-select-label"
                                    value={values.product}
                                    label="Product"
                                    onChange={handleFieldChange("product")}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {productOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Vendor Uptime"
                                placeholder="99.90%"
                                value={values.vendorUptime}
                                onChange={handleFieldChange("vendorUptime", setVendorUptimeTouched)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Vendor MTTR"
                                placeholder="4 Hrs"
                                value={values.vendorMTTR}
                                onChange={handleFieldChange("vendorMTTR", setVendorMTTRTouched)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} />
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Customer Circuit Bill Start Date"
                                InputLabelProps={{ shrink: true }}
                                value={toDateInputValue(values.customerCircuitBillStartDate)}
                                onChange={handleDateFieldChange("customerCircuitBillStartDate")}
                                error={dateError("customerCircuitBillStartDate")}
                                helperText={dateError("customerCircuitBillStartDate") ? "Use dd-mm-yyyy format" : ""}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Customer Circuit Contract Term"
                                value={values.customerCircuitContractTerm}
                                onChange={handleFieldChange("customerCircuitContractTerm")}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Vendor Circuit Bill Start Date"
                                InputLabelProps={{ shrink: true }}
                                value={toDateInputValue(values.vendorCircuitBillStartDate)}
                                onChange={handleDateFieldChange("vendorCircuitBillStartDate")}
                                error={dateError("vendorCircuitBillStartDate")}
                                helperText={dateError("vendorCircuitBillStartDate") ? "Use dd-mm-yyyy format" : ""}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Vendor Circuit Contract Term"
                                value={values.vendorCircuitContractTerm}
                                onChange={handleFieldChange("vendorCircuitContractTerm")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={12}>
                            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                                Create Circuit
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Box>

            <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Container>
    )
}
