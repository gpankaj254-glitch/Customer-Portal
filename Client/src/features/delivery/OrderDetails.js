import * as React from "react"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import FormControl from "@mui/material/FormControl"
import Select from "@mui/material/Select"
import Autocomplete from "@mui/material/Autocomplete"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import Typography from "@mui/material/Typography"
import PropTypes from "prop-types"
import _ from "lodash"
import moment from "moment"
import { useDispatch, useSelector } from "react-redux"
import { updateDeliveryOrder, selectOpenOrderList, selectDeliveredOrderList } from "./deliveryOrderSlice"
import { createCustomer } from "../customers/customerSlice"
import { createSite, updateSite } from "../sites/siteSlice"
import { fetchSitesOfCustomer } from "../inventory/circuitAPI"
import { bandwidthOptions, productOptions } from "../../consts/circuitOptions"
import { ipRequirementOptions, interfaceOptions } from "../../consts/opportunityCommOptions"
import { countryOptions } from "../../consts/countryOptions"
import { orderStatusOptions, milestoneStatusOptions, milestoneNames, siteTypeOptions, orderTypeOptions } from "../../consts/deliveryOrderOptions"
import { combineAddress } from "../../utils/address"
import ConfirmDialog from "../../components/ConfirmDialog"

function toDateInputValue(value) {
    return value ? moment(value).format("YYYY-MM-DD") : ""
}

function customerName(order) {
    return _.get(order, "customer.name") || _.get(order, "newCustomerName", "")
}

function buildInitialValues(order) {
    const milestoneByName = new Map((order.milestones || []).map((milestone) => [milestone.name, milestone]))
    return {
        serialNumber: _.get(order, "serialNumber", ""),
        scloudxOrderReference: _.get(order, "scloudxOrderReference", ""),
        orderType: _.get(order, "orderType", "New"),
        relatedOrderId: _.get(order, "relatedOrderId", ""),
        siteAddress: _.get(order, "siteAddress", ""),
        city: _.get(order, "city", ""),
        state: _.get(order, "state", ""),
        country: _.get(order, "country", ""),
        zipCode: _.get(order, "zipCode", ""),
        product: _.get(order, "product", ""),
        bandwidth: _.get(order, "bandwidth", ""),
        contractTerm: _.get(order, "contractTerm", ""),
        vendorContractTerm: _.get(order, "vendorContractTerm", ""),
        ipRequirement: _.get(order, "ipRequirement", ""),
        interface: _.get(order, "interface", ""),
        customerOrderReference: _.get(order, "customerOrderReference", ""),
        vendorCircuitId: _.get(order, "vendorCircuitId", ""),
        deliveryTimelineDays: _.get(order, "deliveryTimelineDays") ?? "",
        customerPM: _.get(order, "customerPM", ""),
        customerPMDetails: _.get(order, "customerPMDetails", ""),
        lmpName: _.get(order, "lmpName", ""),
        lecPM: _.get(order, "lecPM", ""),
        lecPMDetails: _.get(order, "lecPMDetails", ""),
        endUser: _.get(order, "endUser", ""),
        status: _.get(order, "status", "SCX"),
        milestones: milestoneNames.map((name) => {
            const milestone = milestoneByName.get(name)
            return {
                name,
                status: _.get(milestone, "status", ""),
                date: toDateInputValue(_.get(milestone, "date")),
            }
        }),
        deliveryDate: toDateInputValue(_.get(order, "deliveryDate")),
        customerBillStartDate: toDateInputValue(_.get(order, "customerBillStartDate")),
        customerDelayDays: _.get(order, "customerDelayDays") ?? "",
        vendorBillStartDate: toDateInputValue(_.get(order, "vendorBillStartDate")),
        remarks: _.get(order, "remarks", ""),
        siteType: _.get(order, "siteType", ""),
        siteId: _.get(order, "siteId", ""),
        newSiteName: _.get(order, "newSiteName", ""),
        // Pre-filled from Order Info's own Site Address/City/Zip/Country -
        // "Display already captured Address, City ... with Edit Option"
        // rather than asking for the same details again.
        newSiteAddress: _.get(order, "siteAddress", ""),
        newSiteTown: _.get(order, "city", ""),
        newSitePostalCode: _.get(order, "zipCode", ""),
        newSiteCountry: _.get(order, "country", ""),
        notes: _.get(order, "notes", ""),
    }
}

// "Days (cal)" = Delivery Date - Order Date - Delay (Days). Order Date and
// Delivery Date are real dates, but Delay is a flat day count, not a date
// shift, so an exact weekday-by-weekday count over that span isn't well-
// defined - Days Business/Weeks Business are the standard 5/7 weekday
// approximation instead, same rough conversion used elsewhere for this kind
// of estimate. Display-only - not stored.
function computeDerivedDays(orderDate, deliveryDate, delayDays) {
    if (!orderDate || !deliveryDate) {
        return { calendarDays: null, businessDays: null, weeks: null }
    }
    const calendarDays = moment(deliveryDate).diff(moment(orderDate), "days") - (Number(delayDays) || 0)
    const businessDays = Math.round((calendarDays * 5) / 7)
    const weeks = Math.round((businessDays / 5) * 10) / 10
    return { calendarDays, businessDays, weeks }
}

// Smaller fonts throughout this panel - the tab row, every field's label/
// value, the milestone table and Save - same approach as Inventory.js's own
// compactSx, applied here rather than globally since this panel is nested
// inside an already-compact order row.
const compactSx = {
    "& .MuiTab-root": { minHeight: 34, py: 0.5, fontSize: "0.72rem" },
    "& .MuiInputBase-root, & .MuiInputLabel-root, & .MuiFormLabel-root, & .MuiFormHelperText-root": { fontSize: "0.72rem" },
    "& .MuiMenuItem-root": { fontSize: "0.72rem" },
    "& .MuiTableCell-root": { fontSize: "0.72rem", padding: "4px 8px" },
    "& .MuiButton-root": { fontSize: "0.72rem" },
}

function SectionHeading({ children }) {
    return (
        <Grid item xs={12}>
            <Typography component="h4" variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>{children}</Typography>
        </Grid>
    )
}

// The "VIEW/EDIT ORDERS" screen: order info, the PM/Status block, the fixed
// milestone checklist, and the Complete Order Details block (always shown,
// not gated on Status), each under its own tab - the single, comprehensive
// edit surface for a delivery order (replaces a small popup dialog, since
// the milestone table doesn't fit one). readOnly renders every field
// disabled and hides Save/Create Site, for SCX Management's view-only access.
export default function OrderDetails({ order, readOnly, vendorName }) {
    const dispatch = useDispatch()
    const openOrderList = useSelector(selectOpenOrderList)
    const deliveredOrderList = useSelector(selectDeliveredOrderList)
    const [values, setValues] = React.useState(() => buildInitialValues(order))
    const [saving, setSaving] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)
    const [activeTab, setActiveTab] = React.useState(0)
    const [existingSites, setExistingSites] = React.useState([])
    const [sitesLoading, setSitesLoading] = React.useState(false)
    const [siteConfirmOpen, setSiteConfirmOpen] = React.useState(false)
    const [creatingSite, setCreatingSite] = React.useState(false)
    // Once a New site is already linked, its fields start disabled (a saved
    // record, not a pending edit) until this is switched on - "Display ...
    // with Edit Option".
    const [editingNewSite, setEditingNewSite] = React.useState(false)
    // "We should Create New Customer during delivery process like Site
    // Creation" - same confirm-dialog pattern as the Site block below.
    const [customerConfirmOpen, setCustomerConfirmOpen] = React.useState(false)
    const [creatingCustomer, setCreatingCustomer] = React.useState(false)

    React.useEffect(() => {
        setValues(buildInitialValues(order))
        setEditingNewSite(false)
    }, [order])

    const linkedCustomerId = _.get(order, "customer.id", "")

    // Fetches once Site is set to "Existing" and there's a real linked
    // Customer to scope the list to - a not-yet-a-customer order
    // (newCustomerName) has no existing sites to choose from.
    React.useEffect(() => {
        if (values.siteType !== "Existing" || !linkedCustomerId) {
            return
        }
        setSitesLoading(true)
        fetchSitesOfCustomer({ customerId: linkedCustomerId }).then((result) => {
            setExistingSites(result.results || [])
            setSitesLoading(false)
        })
    }, [values.siteType, linkedCustomerId])

    const relatedOrderOptions = React.useMemo(
        () => [...openOrderList, ...deliveredOrderList].filter((candidate) => candidate.id !== order.id),
        [openOrderList, deliveredOrderList, order.id]
    )

    const handleChange = (name) => (event) => {
        setValues((prev) => ({ ...prev, [name]: event.target.value }))
    }

    const handleMilestoneChange = (name, field) => (event) => {
        setValues((prev) => ({
            ...prev,
            milestones: prev.milestones.map((milestone) => (
                milestone.name === name ? { ...milestone, [field]: event.target.value } : milestone
            )),
        }))
    }

    // Shared by both Save and Save and Complete - statusOverride forces
    // Status to "Completed" for the latter regardless of what's currently
    // selected on the Edit Order tab.
    const buildUpdatePayload = (statusOverride) => ({
        deliveryOrderId: order.id,
        serialNumber: values.serialNumber,
        scloudxOrderReference: values.scloudxOrderReference,
        orderType: values.orderType,
        relatedOrderId: values.orderType === "New" ? "" : values.relatedOrderId,
        siteAddress: values.siteAddress,
        city: values.city,
        state: values.state,
        country: values.country,
        zipCode: values.zipCode,
        product: values.product,
        bandwidth: values.bandwidth,
        contractTerm: values.contractTerm,
        vendorContractTerm: values.vendorContractTerm,
        ipRequirement: values.ipRequirement,
        interface: values.interface,
        customerOrderReference: values.customerOrderReference,
        vendorCircuitId: values.vendorCircuitId,
        deliveryTimelineDays: values.deliveryTimelineDays === "" ? null : Number(values.deliveryTimelineDays),
        customerPM: values.customerPM,
        customerPMDetails: values.customerPMDetails,
        lmpName: values.lmpName,
        lecPM: values.lecPM,
        lecPMDetails: values.lecPMDetails,
        endUser: values.endUser,
        status: statusOverride || values.status,
        milestones: values.milestones,
        deliveryDate: values.deliveryDate,
        customerBillStartDate: values.customerBillStartDate,
        customerDelayDays: values.customerDelayDays === "" ? null : Number(values.customerDelayDays),
        vendorBillStartDate: values.vendorBillStartDate,
        remarks: values.remarks,
        siteType: values.siteType,
        siteId: values.siteId,
        newSiteName: values.newSiteName,
        notes: values.notes,
    })

    const handleSave = async () => {
        setSaving(true)
        try {
            await dispatch(updateDeliveryOrder(buildUpdatePayload())).unwrap()
            setFeedback({ severity: "success", message: `Order "${order.orderId}" updated successfully` })
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update order" })
        } finally {
            setSaving(false)
        }
    }

    // "Save and Complete button should only work when all fields are
    // filled. All Fields Mandatory" - scoped to the Complete Order Details
    // tab itself (Order Info/Edit Order/Milestones are assumed already done
    // by the time an order reaches this tab); Notes stays optional, and
    // Order Date/Vendor Name are always-populated read-only fields, so
    // neither needs checking. Site is only required when this order is
    // actually linked to an existing Customer - otherwise the Site
    // block's own UI already blocks selecting/creating one, so requiring
    // it here would make such orders impossible to ever complete.
    // A real, registered Customer is required (not just a prospect's
    // newCustomerName) - Circuit auto-creation on completion needs one (see
    // deliveryOrder.service.js's createCircuitFromOrder). "Create Customer"
    // on the Order Info tab resolves this the same way "Create Site" below
    // resolves the Site requirement.
    const completeOrderMissingFields = []
    if (!linkedCustomerId) completeOrderMissingFields.push("Customer (create/link a registered Customer on the Order Info tab)")
    if (!values.deliveryDate) completeOrderMissingFields.push("Delivery Date")
    if (!values.customerBillStartDate) completeOrderMissingFields.push("Customer Bill Start Date")
    if (!values.vendorCircuitId) completeOrderMissingFields.push("Vendor Circuit ID")
    if (!values.vendorBillStartDate) completeOrderMissingFields.push("Vendor Bill Start Date")
    if (!values.siteType) completeOrderMissingFields.push("Site - New / Existing")
    else if (linkedCustomerId && !values.siteId) completeOrderMissingFields.push("Site (choose an Existing site, or create/link a New one)")
    if (values.customerDelayDays === "" || values.customerDelayDays === null || values.customerDelayDays === undefined) {
        completeOrderMissingFields.push("Delay (Days)")
    }

    // "Clicking on Save and Complete, Order status - Completed" - saves
    // every pending edit exactly like Save, but forces Status to "Completed"
    // regardless of the Edit Order tab's current selection.
    const handleSaveAndComplete = async () => {
        if (completeOrderMissingFields.length > 0) {
            setFeedback({ severity: "error", message: `Complete Order Details is missing: ${completeOrderMissingFields.join(", ")}` })
            return
        }
        setSaving(true)
        try {
            const result = await dispatch(updateDeliveryOrder(buildUpdatePayload("Completed"))).unwrap()
            setValues((prev) => ({ ...prev, status: "Completed" }))
            // "We need new circuit only after Delivery process is Completed" -
            // the server attempts this automatically as part of the same
            // request (see createCircuitFromOrder); a failure there doesn't
            // block the order from completing, just surfaces here instead.
            if (result && result.circuitCreationError) {
                setFeedback({
                    severity: "warning",
                    message: `Order "${order.orderId}" marked Completed, but the Circuit wasn't created automatically: ${result.circuitCreationError}. Create it manually via Inventory.`,
                })
            } else {
                setFeedback({ severity: "success", message: `Order "${order.orderId}" saved and marked Completed - Circuit created` })
            }
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update order" })
        } finally {
            setSaving(false)
        }
    }

    // "We should Create New Customer during delivery process like Site
    // Creation" - creates the real Customer record from the order's own
    // (prospect) name, then immediately re-links the order to it
    // (customer.id set, newCustomerName cleared - see
    // deliveryOrder.service.js's updateDeliveryOrderById).
    const handleConfirmCreateCustomer = async () => {
        setCreatingCustomer(true)
        try {
            const created = await dispatch(createCustomer({ name: customerName(order) })).unwrap()
            const newCustomer = Array.isArray(created) ? created[0] : created
            await dispatch(updateDeliveryOrder({ deliveryOrderId: order.id, customerId: newCustomer.id })).unwrap()
            setFeedback({ severity: "success", message: `Customer "${newCustomer.name}" created and linked to this order` })
            setCustomerConfirmOpen(false)
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to create customer" })
        } finally {
            setCreatingCustomer(false)
        }
    }

    // "capture all necessary info to Create new Site ID and Create after
    // confirmation" - creates the real Site record (same fields/endpoint as
    // Site Management's own Create Site), then immediately links it and the
    // order's other pending changes by saving the order too, so confirming
    // is the one action that both creates and attaches the site. If a New
    // site is already linked (values.siteId set), this instead updates that
    // existing Site record - the "Edit Option" on an already-created site.
    const handleConfirmCreateSite = async () => {
        setCreatingSite(true)
        try {
            const siteFields = {
                name: values.newSiteName,
                address: values.newSiteAddress,
                postalCode: values.newSitePostalCode,
                town: values.newSiteTown,
                country: values.newSiteCountry,
                // Not independently captured here - the order's own End User
                // (Edit Order tab) is what's used for the site record too.
                endUser: values.endUser,
            }
            if (values.siteId) {
                const updated = await dispatch(updateSite({ siteId: values.siteId, ...siteFields })).unwrap()
                setFeedback({ severity: "success", message: `Site "${updated.name}" updated` })
                setEditingNewSite(false)
            } else {
                const created = await dispatch(createSite({ ...siteFields, customerId: linkedCustomerId })).unwrap()
                const newSite = Array.isArray(created) ? created[0] : created
                setValues((prev) => ({ ...prev, siteId: newSite.id }))
                await dispatch(updateDeliveryOrder({
                    deliveryOrderId: order.id,
                    siteType: "New",
                    siteId: newSite.id,
                })).unwrap()
                setFeedback({ severity: "success", message: `Site "${newSite.name}" created and linked to this order` })
            }
            setSiteConfirmOpen(false)
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to save site" })
        } finally {
            setCreatingSite(false)
        }
    }

    const fieldProps = { fullWidth: true, size: "small", disabled: readOnly }
    const derivedDays = computeDerivedDays(order.orderDate, values.deliveryDate, values.customerDelayDays)
    // "Completed" isn't offered as a fresh dropdown choice (see
    // consts/deliveryOrderOptions.js), but an order already Completed (via
    // Save and Complete) still needs its current value to display here
    // rather than render blank.
    const statusMenuOptions = orderStatusOptions.includes(values.status)
        ? orderStatusOptions
        : [...orderStatusOptions, values.status].filter(Boolean)

    // "Show Completed Order Details always" - all 4 tabs are always present,
    // not gated on order Status.
    const tabs = [
        { label: "Order Info" },
        { label: "Edit Order" },
        { label: "Milestones" },
        { label: "Complete Order Details" },
    ]
    const safeActiveTab = activeTab < tabs.length ? activeTab : 0

    return (
        <Box sx={{ p: 2, ...compactSx }}>
            <Tabs
                value={safeActiveTab}
                onChange={(event, newValue) => setActiveTab(newValue)}
                aria-label={`order ${order.orderId} details`}
                sx={{ minHeight: 34, mb: 2 }}
            >
                {tabs.map((tab) => (
                    <Tab key={tab.label} label={tab.label} />
                ))}
            </Tabs>

            {safeActiveTab === 0 && (
            <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Serial Number" value={values.serialNumber} onChange={handleChange("serialNumber")} />
                </Grid>
                <Grid item xs={12} sm={!linkedCustomerId && !readOnly ? 3 : 4}>
                    <TextField {...fieldProps} label="Customer Name" value={customerName(order)} disabled />
                </Grid>
                {/* "We should Create New Customer during delivery process like
                    Site Creation" - only while this order is still a prospect
                    (newCustomerName, no real Customer linked yet). */}
                {!linkedCustomerId && !readOnly && (
                    <Grid item xs={12} sm={2} sx={{ display: "flex", alignItems: "center" }}>
                        <Button variant="outlined" size="small" onClick={() => setCustomerConfirmOpen(true)}>
                            Create Customer
                        </Button>
                    </Grid>
                )}
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Vendor" value={vendorName} disabled />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Order Date" value={toDateInputValue(order.orderDate)} type="date" InputLabelProps={{ shrink: true }} disabled />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="SCloudX Order Ref" value={values.scloudxOrderReference} onChange={handleChange("scloudxOrderReference")} />
                </Grid>
                <Grid item xs={12} sm={values.orderType === "New" ? 4 : 2}>
                    <FormControl {...fieldProps}>
                        <InputLabel id={`order-type-${order.id}`}>Order Type</InputLabel>
                        <Select labelId={`order-type-${order.id}`} label="Order Type" value={values.orderType} onChange={handleChange("orderType")}>
                            {orderTypeOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                {values.orderType !== "New" && (
                    <Grid item xs={12} sm={2}>
                        <Autocomplete
                            disabled={readOnly}
                            size="small"
                            options={relatedOrderOptions}
                            // "If Order Type is not New, Show SCX Order
                            // Reference in dropdown, not System Order No" -
                            // displayed/searched by scloudxOrderReference;
                            // relatedOrderId itself still stores the system
                            // orderId (see deliveryOrder.model.js).
                            getOptionLabel={(option) => _.get(option, "scloudxOrderReference", "")}
                            value={relatedOrderOptions.find((option) => option.orderId === values.relatedOrderId) || null}
                            onChange={(event, newValue) => setValues((prev) => ({ ...prev, relatedOrderId: newValue ? newValue.orderId : "" }))}
                            renderInput={(params) => <TextField {...params} label="Existing Order Number" />}
                        />
                    </Grid>
                )}
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Customer PO" value={values.customerOrderReference} onChange={handleChange("customerOrderReference")} />
                </Grid>

                <Grid item xs={12} sm={2}>
                    <FormControl {...fieldProps}>
                        <InputLabel id={`product-${order.id}`}>Product</InputLabel>
                        <Select labelId={`product-${order.id}`} label="Product" value={values.product} onChange={handleChange("product")}>
                            <MenuItem value=""><em>None</em></MenuItem>
                            {productOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                    <FormControl {...fieldProps}>
                        <InputLabel id={`bw-${order.id}`}>BW</InputLabel>
                        <Select labelId={`bw-${order.id}`} label="BW" value={values.bandwidth} onChange={handleChange("bandwidth")}>
                            <MenuItem value=""><em>None</em></MenuItem>
                            {bandwidthOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                    <FormControl {...fieldProps}>
                        <InputLabel id={`ip-${order.id}`}>IP</InputLabel>
                        <Select labelId={`ip-${order.id}`} label="IP" value={values.ipRequirement} onChange={handleChange("ipRequirement")}>
                            <MenuItem value=""><em>None</em></MenuItem>
                            {ipRequirementOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                    <FormControl {...fieldProps}>
                        <InputLabel id={`interface-${order.id}`}>Interface</InputLabel>
                        <Select labelId={`interface-${order.id}`} label="Interface" value={values.interface} onChange={handleChange("interface")}>
                            <MenuItem value=""><em>None</em></MenuItem>
                            {interfaceOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                    <TextField {...fieldProps} label="Term" value={values.contractTerm} onChange={handleChange("contractTerm")} />
                </Grid>
                <Grid item xs={12} sm={2}>
                    <TextField {...fieldProps} label="Delivery Timelines (days)" type="number" inputProps={{ min: 0 }} value={values.deliveryTimelineDays} onChange={handleChange("deliveryTimelineDays")} />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField {...fieldProps} label="Site Address" value={values.siteAddress} onChange={handleChange("siteAddress")} />
                </Grid>
                <Grid item xs={12} sm={2}>
                    <TextField {...fieldProps} label="City" value={values.city} onChange={handleChange("city")} />
                </Grid>
                <Grid item xs={12} sm={2}>
                    <TextField {...fieldProps} label="State" value={values.state} onChange={handleChange("state")} />
                </Grid>
                <Grid item xs={12} sm={2}>
                    <TextField {...fieldProps} label="Zip Code" value={values.zipCode} onChange={handleChange("zipCode")} />
                </Grid>
                <Grid item xs={12} sm={2}>
                    <TextField {...fieldProps} label="Country" value={values.country} onChange={handleChange("country")} />
                </Grid>
            </Grid>
            )}

            {safeActiveTab === 1 && (
            <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="End User" value={values.endUser} onChange={handleChange("endUser")} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Customer PM" value={values.customerPM} onChange={handleChange("customerPM")} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Customer PM Details" value={values.customerPMDetails} onChange={handleChange("customerPMDetails")} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="LMP Name" value={values.lmpName} onChange={handleChange("lmpName")} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="LEC PM" value={values.lecPM} onChange={handleChange("lecPM")} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="LEC PM Details" value={values.lecPMDetails} onChange={handleChange("lecPMDetails")} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Vendor Circuit Contract Term" value={values.vendorContractTerm} onChange={handleChange("vendorContractTerm")} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <FormControl {...fieldProps}>
                        <InputLabel id={`order-status-${order.id}`}>Status</InputLabel>
                        <Select labelId={`order-status-${order.id}`} label="Status" value={values.status} onChange={handleChange("status")}>
                            {statusMenuOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
            )}

            {safeActiveTab === 2 && (
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Milestone</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Date (if Completed)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {values.milestones.map((milestone, index) => {
                                    // "non edit unless previous task is completed" - the
                                    // first milestone has no previous task, so it's the
                                    // only one always available.
                                    const previousDone = index === 0 || values.milestones[index - 1].status === "Completed"
                                    const milestoneDisabled = readOnly || !previousDone
                                    return (
                                        <TableRow key={milestone.name}>
                                            <TableCell sx={milestone.name === "Handover" ? { fontWeight: 700, fontStyle: "italic" } : undefined}>
                                                {milestone.name}
                                            </TableCell>
                                            <TableCell>
                                                <FormControl size="small" fullWidth disabled={milestoneDisabled}>
                                                    <Select
                                                        value={milestone.status}
                                                        displayEmpty
                                                        onChange={handleMilestoneChange(milestone.name, "status")}
                                                    >
                                                        <MenuItem value=""><em>Not started</em></MenuItem>
                                                        {milestoneStatusOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    type="date"
                                                    InputLabelProps={{ shrink: true }}
                                                    value={milestone.date}
                                                    onChange={handleMilestoneChange(milestone.name, "date")}
                                                    disabled={readOnly || milestone.status !== "Completed"}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>
            )}

            {safeActiveTab === 3 && (
            <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Order Date" value={toDateInputValue(order.orderDate)} type="date" InputLabelProps={{ shrink: true }} disabled />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Delivery Date" type="date" InputLabelProps={{ shrink: true }} value={values.deliveryDate} onChange={handleChange("deliveryDate")} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Customer Bill Start Date" type="date" InputLabelProps={{ shrink: true }} value={values.customerBillStartDate} onChange={handleChange("customerBillStartDate")} />
                </Grid>

                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Vendor Name" value={vendorName} disabled />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Vendor Circuit ID" value={values.vendorCircuitId} onChange={handleChange("vendorCircuitId")} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField {...fieldProps} label="Vendor Bill Start Date" type="date" InputLabelProps={{ shrink: true }} value={values.vendorBillStartDate} onChange={handleChange("vendorBillStartDate")} />
                </Grid>

                <SectionHeading>Site</SectionHeading>
                <Grid item xs={12} sm={3}>
                    <FormControl {...fieldProps}>
                        <InputLabel id={`site-type-${order.id}`}>Site - New / Existing</InputLabel>
                        <Select labelId={`site-type-${order.id}`} label="Site - New / Existing" value={values.siteType} onChange={handleChange("siteType")}>
                            <MenuItem value=""><em>None</em></MenuItem>
                            {siteTypeOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>

                {values.siteType === "Existing" && (
                    !linkedCustomerId ? (
                        <Grid item xs={12} sm={9}>
                            <Typography variant="body2" color="text.secondary">
                                This order isn&apos;t linked to an existing Customer, so there&apos;s no site list to choose from.
                            </Typography>
                        </Grid>
                    ) : (
                        <Grid item xs={12} sm={9}>
                            <Autocomplete
                                disabled={readOnly}
                                size="small"
                                loading={sitesLoading}
                                options={existingSites}
                                getOptionLabel={(option) => {
                                    // Site's own "ID" - its name (see SiteTable.js, which has
                                    // no separate ID column either) - plus its full address, so
                                    // sites that share a name are still distinguishable.
                                    const name = _.get(option, "name", "")
                                    const address = combineAddress(_.get(option, "location", {}))
                                    return address ? `${name} - ${address}` : name
                                }}
                                value={existingSites.find((site) => site.id === values.siteId) || null}
                                onChange={(event, newValue) => setValues((prev) => ({ ...prev, siteId: newValue ? newValue.id : "" }))}
                                renderInput={(params) => <TextField {...params} label="Existing Site" placeholder="Search sites" />}
                            />
                        </Grid>
                    )
                )}

                {values.siteType === "New" && (
                    !linkedCustomerId ? (
                        <Grid item xs={12} sm={9}>
                            <Typography variant="body2" color="text.secondary">
                                This order isn&apos;t linked to an existing Customer, so a new Site can&apos;t be created for it here - link one on the Order Info tab first.
                            </Typography>
                        </Grid>
                    ) : (
                        <>
                            {values.siteId && !readOnly && (
                                <Grid item xs={12} sm={9}>
                                    {editingNewSite ? (
                                        <Typography variant="body2" color="text.secondary">Editing the linked site's details below.</Typography>
                                    ) : (
                                        <Button variant="outlined" size="small" onClick={() => setEditingNewSite(true)}>
                                            Edit Site Details
                                        </Button>
                                    )}
                                </Grid>
                            )}
                            {/* "Display already captured Address, City ... with Edit Option" -
                                fields are pre-filled (see buildInitialValues) and read-only once
                                the site is already created, until Edit Site Details is clicked. */}
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    {...fieldProps}
                                    disabled={readOnly || (values.siteId && !editingNewSite)}
                                    label="Site Name"
                                    required
                                    value={values.newSiteName}
                                    onChange={handleChange("newSiteName")}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                {/* Not independently editable here - always the value
                                    captured on the Edit Order tab. */}
                                <TextField {...fieldProps} label="End User" value={values.endUser} disabled />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    {...fieldProps}
                                    disabled={readOnly || (values.siteId && !editingNewSite)}
                                    label="Address"
                                    value={values.newSiteAddress}
                                    onChange={handleChange("newSiteAddress")}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    {...fieldProps}
                                    disabled={readOnly || (values.siteId && !editingNewSite)}
                                    label="Town"
                                    value={values.newSiteTown}
                                    onChange={handleChange("newSiteTown")}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    {...fieldProps}
                                    disabled={readOnly || (values.siteId && !editingNewSite)}
                                    label="Postal Code"
                                    value={values.newSitePostalCode}
                                    onChange={handleChange("newSitePostalCode")}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <Autocomplete
                                    disabled={readOnly || (values.siteId && !editingNewSite)}
                                    size="small"
                                    options={countryOptions}
                                    value={values.newSiteCountry || null}
                                    onChange={(event, newValue) => setValues((prev) => ({ ...prev, newSiteCountry: newValue || "" }))}
                                    renderInput={(params) => <TextField {...params} label="Country" />}
                                />
                            </Grid>
                            {!readOnly && (!values.siteId || editingNewSite) && (
                                <Grid item xs={12} sm={3} sx={{ display: "flex", alignItems: "center" }}>
                                    <Button
                                        variant="outlined"
                                        disabled={!values.newSiteName}
                                        onClick={() => setSiteConfirmOpen(true)}
                                    >
                                        {values.siteId ? "Update Site" : "Create Site"}
                                    </Button>
                                </Grid>
                            )}
                        </>
                    )
                )}

                <SectionHeading>Delay</SectionHeading>
                <Grid item xs={12} sm={3}>
                    <TextField {...fieldProps} label="Delay (Days)" type="number" value={values.customerDelayDays} onChange={handleChange("customerDelayDays")} />
                </Grid>
                <Grid item xs={12} sm={3}>
                    <TextField {...fieldProps} label="Days Cal" value={derivedDays.calendarDays ?? ""} disabled />
                </Grid>
                <Grid item xs={12} sm={3}>
                    <TextField {...fieldProps} label="Days Business" value={derivedDays.businessDays ?? ""} disabled />
                </Grid>
                <Grid item xs={12} sm={3}>
                    <TextField {...fieldProps} label="Weeks Business" value={derivedDays.weeks ?? ""} disabled />
                </Grid>

                <Grid item xs={12}>
                    <TextField {...fieldProps} label="Notes" multiline minRows={2} value={values.notes} onChange={handleChange("notes")} />
                </Grid>
            </Grid>
            )}

            {!readOnly && (
                <Grid container spacing={1} sx={{ mt: 1 }}>
                    <Grid item>
                        <Button variant="contained" onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : "Save"}
                        </Button>
                    </Grid>
                    {/* Only on Complete Order Details - the tab that actually reflects
                        an order being wrapped up. Disabled (not just rejected on click)
                        until every field on this tab is filled in. */}
                    {safeActiveTab === 3 && (
                        <Grid item>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={handleSaveAndComplete}
                                disabled={saving || completeOrderMissingFields.length > 0}
                            >
                                {saving ? "Saving..." : "Save and Complete"}
                            </Button>
                            {completeOrderMissingFields.length > 0 && (
                                <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
                                    Missing: {completeOrderMissingFields.join(", ")}
                                </Typography>
                            )}
                        </Grid>
                    )}
                </Grid>
            )}

            <ConfirmDialog
                open={customerConfirmOpen}
                title="Create new customer"
                message={`Create a new Customer "${customerName(order)}" and link this order to it? This can't be undone from here.`}
                confirmLabel="Create"
                onConfirm={handleConfirmCreateCustomer}
                onCancel={() => setCustomerConfirmOpen(false)}
                loading={creatingCustomer}
            />

            <ConfirmDialog
                open={siteConfirmOpen}
                title={values.siteId ? "Update site" : "Create new site"}
                message={
                    values.siteId
                        ? `Update site "${values.newSiteName}" for ${customerName(order)}?`
                        : `Create a new site "${values.newSiteName}" for ${customerName(order)} and link it to this order?`
                }
                confirmLabel={values.siteId ? "Update" : "Create"}
                onConfirm={handleConfirmCreateSite}
                onCancel={() => setSiteConfirmOpen(false)}
                loading={creatingSite}
            />

            <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Box>
    )
}

OrderDetails.propTypes = {
    order: PropTypes.object.isRequired,
    readOnly: PropTypes.bool,
    vendorName: PropTypes.string,
}

OrderDetails.defaultProps = {
    readOnly: false,
    vendorName: "",
}
