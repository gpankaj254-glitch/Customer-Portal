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
import { createDeliveryOrder, getDeliveryOrders, selectOpenOrderList, selectDeliveredOrderList } from "./deliveryOrderSlice"
import { getCustomers, selectCustomerList } from "../customers/customerSlice"
import { getVendors, selectVendorList } from "../vendors/vendorSlice"
import { bandwidthOptions, productOptions } from "../../consts/circuitOptions"
import { ipRequirementOptions, interfaceOptions } from "../../consts/opportunityCommOptions"
import { countryOptions } from "../../consts/countryOptions"
import { orderTypeOptions } from "../../consts/deliveryOrderOptions"

const initialFormValues = {
    serialNumber: "",
    scloudxOrderReference: "",
    orderType: "New",
    relatedOrderId: "",
    siteAddress: "",
    city: "",
    state: "",
    zipCode: "",
    product: "",
    bandwidth: "",
    contractTerm: "",
    ipRequirement: "",
    interface: "",
    customerOrderReference: "",
    deliveryTimelineDays: "",
}

// "Customer Name - Just allow to select existing customer. For New
// Customer message - Create new customer through Customer Management
// Module" - Customer Name is existing-only here (no freeSolo/newCustomerName
// branch, unlike Create Opportunity's Customer/Prospect Name); a customer
// not yet in the system is created via Customer Management first, same as
// Vendor above.
export default function CreateDeliveryOrder() {
    const dispatch = useDispatch()
    const customerList = useSelector(selectCustomerList)
    const vendorList = useSelector(selectVendorList)
    // Already fetched by the parent DeliveryOrders page on mount (both
    // tabs), regardless of which of its own tabs is active first - no need
    // to fetch again here.
    const openOrderList = useSelector(selectOpenOrderList)
    const deliveredOrderList = useSelector(selectDeliveredOrderList)
    const relatedOrderOptions = React.useMemo(
        () => [...openOrderList, ...deliveredOrderList],
        [openOrderList, deliveredOrderList]
    )

    const [selectedCustomer, setSelectedCustomer] = React.useState(null)
    const [selectedVendor, setSelectedVendor] = React.useState(null)
    const [country, setCountry] = React.useState("")
    const [orderDate, setOrderDate] = React.useState(() => moment().format("YYYY-MM-DD"))
    const [values, setValues] = React.useState(initialFormValues)
    const [notes, setNotes] = React.useState("")
    const [feedback, setFeedback] = React.useState(null)

    // Reachable directly (SCX Service Delivery's own side menu, or the
    // Management dashboard's Delivery tab) without ever visiting Customer/
    // Vendor Management first, so this fetches its own lists.
    React.useEffect(() => {
        dispatch(getCustomers({ limit: 1000, page: 1 }))
        dispatch(getVendors({ limit: 1000, page: 1 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const customerOptions = React.useMemo(
        () => customerList.slice().sort((a, b) => a.name.localeCompare(b.name)),
        [customerList]
    )
    const vendorOptions = React.useMemo(
        () => vendorList.slice().sort((a, b) => a.name.localeCompare(b.name)),
        [vendorList]
    )

    const handleFieldChange = (name) => (event) => {
        setValues((prev) => ({ ...prev, [name]: event.target.value }))
    }

    const resetForm = () => {
        setSelectedCustomer(null)
        setSelectedVendor(null)
        setCountry("")
        setOrderDate(moment().format("YYYY-MM-DD"))
        setValues(initialFormValues)
        setNotes("")
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (!selectedCustomer) {
            setFeedback({ severity: "error", message: "Please select an existing Customer. To add a new one, use the Customer Management module first." })
            return
        }
        if (!values.scloudxOrderReference) {
            setFeedback({ severity: "error", message: "SCloudX Order Ref is required" })
            return
        }
        if (!selectedVendor) {
            setFeedback({ severity: "error", message: "Please select a vendor" })
            return
        }
        if (!orderDate) {
            setFeedback({ severity: "error", message: "Order Date is required" })
            return
        }

        const payload = {
            customerId: selectedCustomer.id,
            serialNumber: values.serialNumber,
            scloudxOrderReference: values.scloudxOrderReference,
            orderType: values.orderType,
            relatedOrderId: values.orderType === "New" ? "" : values.relatedOrderId,
            siteAddress: values.siteAddress,
            city: values.city,
            state: values.state,
            country,
            zipCode: values.zipCode,
            product: values.product,
            bandwidth: values.bandwidth,
            contractTerm: values.contractTerm,
            ipRequirement: values.ipRequirement,
            interface: values.interface,
            vendorId: selectedVendor.id,
            customerOrderReference: values.customerOrderReference,
            orderDate,
            deliveryTimelineDays: values.deliveryTimelineDays === "" ? null : Number(values.deliveryTimelineDays),
            notes,
        }

        try {
            await dispatch(createDeliveryOrder(payload)).unwrap()
            setFeedback({ severity: "success", message: "Delivery order created successfully" })
            resetForm()
            dispatch(getDeliveryOrders({ limit: 1000, page: 1, tab: "open" }))
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to create delivery order" })
        }
    }

    return (
        <Container component="main" maxWidth="md">
            <CssBaseline />
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography component="h1" variant="h5">New Order</Typography>

                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3, width: "100%" }}>
                    <Grid container spacing={2} justifyContent="center">
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Serial Number"
                                value={values.serialNumber}
                                onChange={handleFieldChange("serialNumber")}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                options={customerOptions}
                                getOptionLabel={(customer) => _.get(customer, "name", "")}
                                value={selectedCustomer}
                                onChange={(event, newValue) => setSelectedCustomer(newValue)}
                                noOptionsText="No matching customer - create one via Customer Management"
                                renderInput={(params) => (
                                    <TextField {...params} label="Customer Name" required placeholder="Search existing customers" />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                label="SCloudX Order Ref"
                                value={values.scloudxOrderReference}
                                onChange={handleFieldChange("scloudxOrderReference")}
                            />
                        </Grid>
                        <Grid item xs={12} sm={values.orderType === "New" ? 6 : 3}>
                            <FormControl fullWidth>
                                <InputLabel id="delivery-order-type-label">Order Type</InputLabel>
                                <Select
                                    labelId="delivery-order-type-label"
                                    value={values.orderType}
                                    label="Order Type"
                                    onChange={handleFieldChange("orderType")}
                                >
                                    {orderTypeOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        {values.orderType !== "New" && (
                            <Grid item xs={12} sm={3}>
                                <Autocomplete
                                    options={relatedOrderOptions}
                                    getOptionLabel={(option) => _.get(option, "orderId", "")}
                                    value={relatedOrderOptions.find((option) => option.orderId === values.relatedOrderId) || null}
                                    onChange={(event, newValue) => setValues((prev) => ({ ...prev, relatedOrderId: newValue ? newValue.orderId : "" }))}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Existing Order Number" placeholder="Search order ID" />
                                    )}
                                />
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Site Address"
                                value={values.siteAddress}
                                onChange={handleFieldChange("siteAddress")}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField fullWidth label="City" value={values.city} onChange={handleFieldChange("city")} />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField fullWidth label="State" value={values.state} onChange={handleFieldChange("state")} />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <Autocomplete
                                fullWidth
                                options={countryOptions}
                                value={country || null}
                                onChange={(event, newValue) => setCountry(newValue || "")}
                                renderInput={(params) => <TextField {...params} label="Country" />}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField fullWidth label="Zip Code" value={values.zipCode} onChange={handleFieldChange("zipCode")} />
                        </Grid>

                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth>
                                <InputLabel id="delivery-order-product-label">Product</InputLabel>
                                <Select
                                    labelId="delivery-order-product-label"
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
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth>
                                <InputLabel id="delivery-order-bw-label">BW</InputLabel>
                                <Select
                                    labelId="delivery-order-bw-label"
                                    value={values.bandwidth}
                                    label="BW"
                                    onChange={handleFieldChange("bandwidth")}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {bandwidthOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth>
                                <InputLabel id="delivery-order-ip-label">IP</InputLabel>
                                <Select
                                    labelId="delivery-order-ip-label"
                                    value={values.ipRequirement}
                                    label="IP"
                                    onChange={handleFieldChange("ipRequirement")}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {ipRequirementOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth>
                                <InputLabel id="delivery-order-interface-label">Interface</InputLabel>
                                <Select
                                    labelId="delivery-order-interface-label"
                                    value={values.interface}
                                    label="Interface"
                                    onChange={handleFieldChange("interface")}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {interfaceOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Term"
                                placeholder="12 Mths"
                                value={values.contractTerm}
                                onChange={handleFieldChange("contractTerm")}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                options={vendorOptions}
                                getOptionLabel={(vendor) => _.get(vendor, "name", "")}
                                value={selectedVendor}
                                onChange={(event, newVendor) => setSelectedVendor(newVendor)}
                                renderInput={(params) => (
                                    <TextField {...params} label="Vendor" required placeholder="Search vendors" />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Customer PO"
                                placeholder="PO0020519"
                                value={values.customerOrderReference}
                                onChange={handleFieldChange("customerOrderReference")}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                required
                                fullWidth
                                type="date"
                                label="Order Date"
                                InputLabelProps={{ shrink: true }}
                                value={orderDate}
                                onChange={(event) => setOrderDate(event.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                type="number"
                                inputProps={{ min: 0 }}
                                label="Delivery Timelines (days)"
                                value={values.deliveryTimelineDays}
                                onChange={handleFieldChange("deliveryTimelineDays")}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                label="Notes"
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                            />
                        </Grid>

                        <Grid item xs={12} sm={12}>
                            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                                Create Order
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
