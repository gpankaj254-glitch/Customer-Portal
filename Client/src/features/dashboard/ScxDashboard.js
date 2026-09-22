import * as React from "react"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TextField from "@mui/material/TextField"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
import Select from "@mui/material/Select"
import MenuItem from "@mui/material/MenuItem"
import Button from "@mui/material/Button"
import Link from "@mui/material/Link"
import Alert from "@mui/material/Alert"
import PropTypes from "prop-types"
import _ from "lodash"
import moment from "moment"
import { useDispatch, useSelector } from "react-redux"
import { StatTile, CountChart } from "./DashboardWidgets"
import {
    getDashboardSummary,
    getOpenTicketsAnalysis,
    getClosedTicketsAnalysis,
    selectDashboardSummary,
    selectDashboardSummaryError,
    selectOpenTicketsAnalysis,
    selectOpenTicketsAnalysisError,
    selectClosedTicketsAnalysis,
    selectClosedTicketsAnalysisError,
    selectClosedTicketsAnalysisStatus,
} from "./dashboardSlice"
import { getCustomers, selectCustomerList } from "../customers/customerSlice"
import { focusTicket } from "../tickets/ticketSlice"
import { togglePage } from "../landing/landingSlice"
import { selectUser } from "../auth/authSlice"
import SalesDashboard from "../opportunities/SalesDashboard"
import { getDeliveryOrders, selectOpenOrderList } from "../delivery/deliveryOrderSlice"
import { getVendors } from "../vendors/vendorSlice"
import DeliveryOrderTable from "../delivery/DeliveryOrderTable"
import { pages, roles } from "../../consts"
import { pageStatusVals } from "../tickets/utils"
import { getFormattedDateTimeGMT } from "../../utils/dates"

const DATE_FORMAT = "YYYY-MM-DD"

const TICKET_TAB_LABELS = ["Main Dashboard", "Open Tickets", "Closed Tickets"]
// "Delivery" and the Sales tabs below are both shown to SCX Admin only -
// SCX NOC (which shares this same dashboard component) gets neither. SCX
// Admin has full rights on Delivery Orders (see roles.js), so this table is
// rendered with canEdit/canDelete, same as the module's own View Open Order
// tab.
const DELIVERY_TAB_LABEL = "Delivery"
// Shown to SCX Admin only, after the ticket tabs - they are the Sales
// dashboard's own Summary / Opportunities / Supplier tabs (see SalesDashboard).
const SALES_TAB_LABELS = ["Sales Summary", "Sales Opportunities", "Sales Supplier"]

// The Closed Tickets tab opens on (and Reset returns to) the last 7 days.
function defaultClosedRange() {
    return {
        startDate: moment().subtract(7, "days").format(DATE_FORMAT),
        endDate: moment().format(DATE_FORMAT),
    }
}

function SectionHeading({ children }) {
    return (
        <Grid item xs={12}>
            <Typography component="h2" variant="h5" sx={{ mt: 0.5, fontSize: "0.85rem", fontWeight: 600 }}>{children}</Typography>
        </Grid>
    )
}

SectionHeading.propTypes = {
    children: PropTypes.node.isRequired,
}

function OpenTicketCharts({ analysis }) {
    return (
        <>
            <Grid item xs={12} sm={6}>
                <CountChart compact title="Open Tickets - Problem Type wise" data={_.get(analysis, "problemTypeWise", [])} />
            </Grid>
            <Grid item xs={12} sm={6}>
                <CountChart compact title="Open Tickets - Priority wise" data={_.get(analysis, "priorityWise", [])} />
            </Grid>
            <Grid item xs={12} sm={6}>
                <CountChart compact title="Open Tickets - Status wise" data={_.get(analysis, "statusWise", [])} />
            </Grid>
            <Grid item xs={12} sm={6}>
                <CountChart compact title="Open Tickets - Vendor Status wise" data={_.get(analysis, "vendorStatusWise", [])} />
            </Grid>
        </>
    )
}

OpenTicketCharts.propTypes = {
    analysis: PropTypes.object.isRequired,
}

const openTicketColumns = [
    "Ticket ID",
    "Customer Reference",
    "Vendor Reference",
    "Vendor Circuit ID",
    "Vendor Name",
    "Problem Type",
    "Ticket Status",
    "Vendor Status",
    "Ticket Create Date (GMT)",
    "Days Pending",
]

// Case-insensitive match against every column actually shown in the table -
// Vendor Circuit ID/Name included, so the new "Allow Search on the displayed
// field" covers them too, not just the original columns.
function matchesOpenTicketSearch(row, term) {
    if (!term) {
        return true
    }
    const haystack = [
        row.ticketId,
        row.customerReference,
        row.vendorTicketId,
        row.vendorCircuitId,
        row.vendorName,
        row.problemType,
        row.status,
        row.vendorTicketStatus,
    ]
    return haystack.some((value) => String(value || "").toLowerCase().includes(term))
}

function OpenTicketsTable({ rows, onOpenTicket }) {
    return (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
            <Table
                size="small"
                stickyHeader
                sx={{ "& .MuiTableCell-root": { fontSize: "0.72rem", padding: "4px 8px" } }}
            >
                <TableHead>
                    <TableRow>
                        {openTicketColumns.map((label) => (
                            <TableCell
                                key={label}
                                sx={{ fontWeight: 600, width: label === "Vendor Circuit ID" ? "8%" : undefined }}
                            >
                                {label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={openTicketColumns.length}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.72rem" }}>No open tickets</Typography>
                            </TableCell>
                        </TableRow>
                    )}
                    {rows.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>
                                <Link
                                    component="button"
                                    type="button"
                                    underline="hover"
                                    onClick={() => onOpenTicket(row.ticketId)}
                                    sx={{ fontSize: "inherit", verticalAlign: "baseline" }}
                                >
                                    {row.ticketId}
                                </Link>
                            </TableCell>
                            <TableCell>{row.customerReference}</TableCell>
                            <TableCell>{row.vendorTicketId}</TableCell>
                            <TableCell sx={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{row.vendorCircuitId}</TableCell>
                            <TableCell>{row.vendorName}</TableCell>
                            <TableCell>{row.problemType}</TableCell>
                            <TableCell>{row.status}</TableCell>
                            <TableCell>{row.vendorTicketStatus}</TableCell>
                            <TableCell>{getFormattedDateTimeGMT(row.createdAt)}</TableCell>
                            <TableCell>{row.daysPending}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

OpenTicketsTable.propTypes = {
    rows: PropTypes.array.isRequired,
    onOpenTicket: PropTypes.func.isRequired,
}

export default function ScxDashboard({ embedded }) {
    const dispatch = useDispatch()
    const summary = useSelector(selectDashboardSummary)
    const summaryError = useSelector(selectDashboardSummaryError)
    const openAnalysis = useSelector(selectOpenTicketsAnalysis)
    const openAnalysisError = useSelector(selectOpenTicketsAnalysisError)
    const closedAnalysis = useSelector(selectClosedTicketsAnalysis)
    const closedAnalysisError = useSelector(selectClosedTicketsAnalysisError)
    const closedAnalysisStatus = useSelector(selectClosedTicketsAnalysisStatus)
    const customerList = useSelector(selectCustomerList)
    const openOrderList = useSelector(selectOpenOrderList)
    const user = useSelector(selectUser)
    // Both the Delivery tab and the Sales tabs are SCX Admin only - SCX NOC
    // shares this same dashboard component but gets neither. `embedded`
    // (set when nested inside ManagementDashboard.js's own NOC tab)
    // suppresses both, since Delivery/Sales already exist there as separate
    // top-level tabs - showing them again here would just duplicate them.
    const isAdmin = user.role === roles.SCLOUDX_ADMIN && !embedded
    const deliveryTabIndex = TICKET_TAB_LABELS.length
    const salesTabStartIndex = TICKET_TAB_LABELS.length + 1
    const tabLabels = isAdmin ? [...TICKET_TAB_LABELS, DELIVERY_TAB_LABEL, ...SALES_TAB_LABELS] : TICKET_TAB_LABELS

    const [activeTab, setActiveTab] = React.useState(0)
    const [startDate, setStartDate] = React.useState(() => defaultClosedRange().startDate)
    const [endDate, setEndDate] = React.useState(() => defaultClosedRange().endDate)
    const [filterCustomerId, setFilterCustomerId] = React.useState("")
    const [openTicketSearch, setOpenTicketSearch] = React.useState("")

    React.useEffect(() => {
        dispatch(getDashboardSummary())
        dispatch(getOpenTicketsAnalysis())
        dispatch(getCustomers({ limit: 200, page: 1 }))
        dispatch(getClosedTicketsAnalysis(defaultClosedRange()))
    }, [dispatch])

    // "Add Service Delivery Module and Dashboard to ... SCX Admin" - same
    // openOrderList/vendor data the Service Delivery Management module and
    // the Delivery role's own Dashboard use (see deliveryOrderSlice.js /
    // Dashboard.js).
    React.useEffect(() => {
        if (!isAdmin) {
            return
        }
        dispatch(getDeliveryOrders({ limit: 1000, page: 1, search: "", tab: "open" }))
        dispatch(getVendors({ limit: 1000, page: 1 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin])

    // Sends the user to Tickets > View Open Ticket with this ticket's details
    // expanded (see ticketSlice's focusTicket and TicketsTable).
    const handleOpenTicket = (ticketId) => {
        dispatch(focusTicket(ticketId))
        dispatch(togglePage(pages.TICKETS))
    }

    const handleApplyFilter = () => {
        dispatch(getClosedTicketsAnalysis({ startDate, endDate, customerId: filterCustomerId }))
    }

    const handleResetFilter = () => {
        const range = defaultClosedRange()
        setStartDate(range.startDate)
        setEndDate(range.endDate)
        setFilterCustomerId("")
        dispatch(getClosedTicketsAnalysis(range))
    }

    if (summaryError || openAnalysisError || closedAnalysisError) {
        return <Alert severity="error">Unable to load the dashboard</Alert>
    }
    if (!summary || !openAnalysis || !closedAnalysis) {
        return <Typography variant="body2">Loading...</Typography>
    }

    const closureTime = _.get(closedAnalysis, "closureTime", {})
    const openTicketSearchTerm = openTicketSearch.trim().toLowerCase()
    const openTickets = _.get(openAnalysis, "tickets", [])
    const filteredOpenTickets = openTickets.filter((row) => matchesOpenTicketSearch(row, openTicketSearchTerm))

    return (
        <Grid container spacing={1.5}>
            <Grid item xs={12}>
                <Tabs
                    value={activeTab}
                    onChange={(event, newValue) => setActiveTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ minHeight: 34, "& .MuiTab-root": { minHeight: 34, py: 0.5, fontSize: "0.72rem" } }}
                >
                    {tabLabels.map((label) => (
                        <Tab key={label} label={label} />
                    ))}
                </Tabs>
            </Grid>

            {activeTab === 0 && (
                <>
                    <Grid item xs={12} sm={6} md={4}>
                        <StatTile compact title="Total Customers" value={_.get(summary, "activeCustomers", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <StatTile compact title="Active Sites" value={_.get(summary, "activeSites", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <StatTile compact title="Active Circuits" value={_.get(summary, "activeCircuits", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <StatTile compact title="Open Tickets" value={_.get(summary, "openTickets", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <StatTile compact title="Open Tickets > 2 Days" value={_.get(summary, "openTicketsOverTwoDays", 0)} />
                    </Grid>
                    <OpenTicketCharts analysis={openAnalysis} />
                </>
            )}

            {activeTab === 1 && (
                <>
                    <OpenTicketCharts analysis={openAnalysis} />
                    <SectionHeading>Open Tickets</SectionHeading>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Search open tickets"
                            placeholder="Search by any column shown below"
                            value={openTicketSearch}
                            onChange={(event) => setOpenTicketSearch(event.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <OpenTicketsTable rows={filteredOpenTickets} onOpenTicket={handleOpenTicket} />
                    </Grid>
                </>
            )}

            {activeTab === 2 && (
                <>
                    <SectionHeading>Filter By</SectionHeading>
                    <Grid item xs={12}>
                        <Paper
                            sx={{
                                p: 1,
                                "& .MuiInputBase-root, & .MuiInputLabel-root, & .MuiButton-root": { fontSize: "0.75rem" },
                                "& .MuiMenuItem-root": { fontSize: "0.75rem" },
                            }}
                        >
                            <Grid container spacing={1} alignItems="center">
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="date"
                                        label="Start Date"
                                        InputLabelProps={{ shrink: true }}
                                        value={startDate}
                                        onChange={(event) => setStartDate(event.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="date"
                                        label="End Date"
                                        InputLabelProps={{ shrink: true }}
                                        value={endDate}
                                        onChange={(event) => setEndDate(event.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel id="dashboard-customer-filter-label">Customer</InputLabel>
                                        <Select
                                            labelId="dashboard-customer-filter-label"
                                            value={filterCustomerId}
                                            label="Customer"
                                            onChange={(event) => setFilterCustomerId(event.target.value)}
                                        >
                                            <MenuItem value=""><em>All Customers</em></MenuItem>
                                            {customerList.map((customer) => (
                                                <MenuItem key={customer.id} value={customer.id}>{customer.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={3} sx={{ display: "flex", gap: 1 }}>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        onClick={handleApplyFilter}
                                        disabled={closedAnalysisStatus === pageStatusVals.loading}
                                    >
                                        Apply
                                    </Button>
                                    <Button size="small" variant="text" onClick={handleResetFilter}>Reset</Button>
                                </Grid>
                            </Grid>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, fontSize: "0.68rem" }}>
                                Showing tickets closed in the selected date range (defaults to the last 7 days).
                            </Typography>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <StatTile compact title="Total Closed Tickets" value={_.get(closedAnalysis, "totalClosed", 0)} />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <StatTile compact title="Closed within 2 Days" value={_.get(closureTime, "within2Days", 0)} />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <StatTile compact title="Closed in 2-5 Days" value={_.get(closureTime, "from2To5Days", 0)} />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <StatTile compact title="Closed in 5-10 Days" value={_.get(closureTime, "from5To10Days", 0)} />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <StatTile compact title="Closed in > 10 Days" value={_.get(closureTime, "over10Days", 0)} />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <CountChart compact title="Closed Tickets - Problem Type wise" data={_.get(closedAnalysis, "problemTypeWise", [])} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <CountChart compact title="Closed Tickets - Priority wise" data={_.get(closedAnalysis, "priorityWise", [])} />
                    </Grid>
                </>
            )}

            {isAdmin && activeTab === deliveryTabIndex && (
                <>
                    <SectionHeading>View Open Orders</SectionHeading>
                    <Grid item xs={12}>
                        <DeliveryOrderTable rows={openOrderList} canEdit canDelete dashboardView />
                    </Grid>
                </>
            )}

            {isAdmin && activeTab >= salesTabStartIndex && (
                <Grid item xs={12}>
                    <SalesDashboard embeddedTab={activeTab - salesTabStartIndex} compact />
                </Grid>
            )}
        </Grid>
    )
}

ScxDashboard.propTypes = {
    embedded: PropTypes.bool,
}

ScxDashboard.defaultProps = {
    embedded: false,
}
