import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
import Select from "@mui/material/Select"
import MenuItem from "@mui/material/MenuItem"
import Button from "@mui/material/Button"
import { Alert } from "@mui/material"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import PropTypes from "prop-types"
import _ from "lodash"
import Title from "./Title"

import {getSites, selectGetSiteError, selectPageStatus as selectGetSiteStatus, selectSiteList} from "../inventory/inventorySlice"
import { getCustomers, selectCustomerList, selectGetCustomersError, selectPageStatus as selectGetCustomerStatus } from "../customers/customerSlice"
import {
    getDashboardSummary,
    getClosedTicketsAnalysis,
    selectDashboardSummary,
    selectClosedTicketsAnalysis,
    selectClosedTicketsAnalysisStatus,
} from "./dashboardSlice"

import { useSelector, useDispatch } from "react-redux"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { pageStatusVals } from "../tickets/utils"
import SalesDashboard from "../opportunities/SalesDashboard"

function StatTile({ title, value }) {
    return (
        <Paper sx={{ p: 1, display: "flex", flexDirection: "column", height: 90, justifyContent: "center" }}>
            <Title>{title}</Title>
            <Typography component="p" variant="h3" sx={{ fontSize: "1.75rem" }}>{value}</Typography>
        </Paper>
    )
}

StatTile.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

function ClosedTicketsChart({ title, data }) {
    return (
        <Paper sx={{ p: 1, height: 220, display: "flex", flexDirection: "column" }}>
            <Title>{title}</Title>
            {data.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "1.3rem" }}>No data</Typography>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 32 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={40} tick={{ fontSize: 9 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1976d2" />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </Paper>
    )
}

ClosedTicketsChart.propTypes = {
    title: PropTypes.string.isRequired,
    data: PropTypes.array.isRequired,
}

function DashboardContent() {
    const dispatch = useDispatch()
    const user = useSelector(selectUser)
    const isScx = user.role === roles.SCLOUDX_ADMIN || user.role === roles.SCLOUDX_USER
    const isCustomerRole = user.role === roles.CUSTOMER_ADMIN || user.role === roles.CUSTOMER_USER
    const isSalesRole = user.role === roles.SCLOUDX_SALES_ADMIN || user.role === roles.SCLOUDX_SALES_USER
    // SCX sees every customer's inventory with a Customer filter; a Customer
    // Admin/User sees the identical layout but pre-scoped server-side to
    // just their own customer, with the now-redundant Customer picker and
    // "Active Customers"/"Customer wise Tickets" breakdowns omitted.
    const showFullDashboard = isScx || isCustomerRole

    const getSiteError = useSelector(selectGetSiteError)
    const getCustomerError = useSelector(selectGetCustomersError)
    const getCustomerStatus = useSelector(selectGetCustomerStatus)
    const getSiteStatus = useSelector(selectGetSiteStatus)
    const customerList = useSelector(selectCustomerList)
    const siteList = useSelector(selectSiteList)

    const summary = useSelector(selectDashboardSummary)
    const closedTicketsAnalysis = useSelector(selectClosedTicketsAnalysis)
    const closedTicketsAnalysisStatus = useSelector(selectClosedTicketsAnalysisStatus)

    const [startDate, setStartDate] = React.useState("")
    const [endDate, setEndDate] = React.useState("")
    const [filterCustomerId, setFilterCustomerId] = React.useState("")

    React.useEffect(() => {
        // SalesDashboard fetches its own data (Sales roles have no rights to
        // site/customer data, and neither is relevant to it anyway).
        if (isSalesRole) {
            return
        }
        const data = { limit: 200, page: 1 }
        dispatch(getSites(data))
        dispatch(getCustomers(data))
        if (showFullDashboard) {
            dispatch(getDashboardSummary())
            dispatch(getClosedTicketsAnalysis({}))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleApplyFilter = () => {
        dispatch(getClosedTicketsAnalysis({ startDate, endDate, customerId: filterCustomerId }))
    }

    const handleClearFilter = () => {
        setStartDate("")
        setEndDate("")
        setFilterCustomerId("")
        dispatch(getClosedTicketsAnalysis({}))
    }

    if (!isSalesRole && (getSiteError || getCustomerError)) {
        return <Alert severity="error">Unable to load</Alert>
    }
    if (!isSalesRole && (getCustomerStatus !== pageStatusVals.fetched || getSiteStatus !== pageStatusVals.fetched)) {
        return <div>loading</div>
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 1.5, mb: 1.5 }}>
            <Grid container spacing={1.5}>
                <Grid item xs={12}>
                    <Typography component="h1" variant="h1" sx={{ fontSize: "1.5rem" }}>
                        Welcome, {user.name} !!
                    </Typography>
                </Grid>

                {isSalesRole ? (
                    <Grid item xs={12}>
                        <SalesDashboard />
                    </Grid>
                ) : showFullDashboard ? (
                    <>
                        {isScx && (
                            <Grid item xs={12} sm={6} md={4}>
                                <StatTile title="Active Customers" value={_.get(summary, "activeCustomers", 0)} />
                            </Grid>
                        )}
                        <Grid item xs={12} sm={6} md={4}>
                            <StatTile title="Active Sites" value={_.get(summary, "activeSites", 0)} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <StatTile title="Active Circuits" value={_.get(summary, "activeCircuits", 0)} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <StatTile title="Open Tickets" value={_.get(summary, "openTickets", 0)} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <StatTile title="Tickets Open for more than 2 days" value={_.get(summary, "openTicketsOverTwoDays", 0)} />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography component="h2" variant="h5" sx={{ mt: 1, fontSize: "1rem" }}>Closed Tickets Analysis</Typography>
                        </Grid>

                        <Grid item xs={12} sm={isScx ? 4 : 6}>
                            <StatTile title="Total Tickets Closed" value={_.get(closedTicketsAnalysis, "totalClosed", 0)} />
                        </Grid>
                        {isScx && (
                            <Grid item xs={12} sm={4}>
                                <ClosedTicketsChart title="Customer wise Tickets" data={_.get(closedTicketsAnalysis, "customerWise", [])} />
                            </Grid>
                        )}
                        <Grid item xs={12} sm={isScx ? 4 : 6}>
                            <ClosedTicketsChart title="Category Wise Tickets" data={_.get(closedTicketsAnalysis, "categoryWise", [])} />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography component="h3" variant="subtitle1" sx={{ mt: 0.5, fontSize: "1rem" }}>Filter By</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Paper sx={{ p: 1 }}>
                                <Grid container spacing={1} alignItems="center">
                                    <Grid item xs={12} sm={isScx ? 3 : 4}>
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
                                    <Grid item xs={12} sm={isScx ? 3 : 4}>
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
                                    {isScx && (
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
                                    )}
                                    <Grid item xs={12} sm={isScx ? 3 : 4} sx={{ display: "flex", gap: 1 }}>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={handleApplyFilter}
                                            disabled={closedTicketsAnalysisStatus === pageStatusVals.loading}
                                        >
                                            Apply
                                        </Button>
                                        <Button size="small" variant="text" onClick={handleClearFilter}>Clear</Button>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                    </>
                ) : (
                    <Grid item xs={12} md={4} lg={3}>
                        <StatTile title="Number of sites" value={siteList.length} />
                    </Grid>
                )}
            </Grid>
        </Container>
    )
}

export default function Dashboard() {
    return <DashboardContent />
}
