import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import { Alert } from "@mui/material"
import _ from "lodash"

import { StatTile, CountChart } from "./DashboardWidgets"
import {getSites, selectGetSiteError, selectPageStatus as selectGetSiteStatus, selectSiteList} from "../inventory/inventorySlice"
import { getCustomers, selectGetCustomersError, selectPageStatus as selectGetCustomerStatus } from "../customers/customerSlice"
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
import ScxDashboard from "./ScxDashboard"

function DashboardContent() {
    const dispatch = useDispatch()
    const user = useSelector(selectUser)
    const isScx = user.role === roles.SCLOUDX_ADMIN || user.role === roles.SCLOUDX_USER
    const isCustomerRole = user.role === roles.CUSTOMER_ADMIN || user.role === roles.CUSTOMER_USER
    const isSalesRole = user.role === roles.SCLOUDX_SALES_ADMIN || user.role === roles.SCLOUDX_SALES_USER
    // SalesDashboard and ScxDashboard fetch their own data; every other role
    // (Customer Admin/User, and the plain fallback) uses the site/customer
    // fetches and layout below.
    const hasOwnDashboard = isSalesRole || isScx

    const getSiteError = useSelector(selectGetSiteError)
    const getCustomerError = useSelector(selectGetCustomersError)
    const getCustomerStatus = useSelector(selectGetCustomerStatus)
    const getSiteStatus = useSelector(selectGetSiteStatus)
    const siteList = useSelector(selectSiteList)

    const summary = useSelector(selectDashboardSummary)
    const closedTicketsAnalysis = useSelector(selectClosedTicketsAnalysis)
    const closedTicketsAnalysisStatus = useSelector(selectClosedTicketsAnalysisStatus)

    const [startDate, setStartDate] = React.useState("")
    const [endDate, setEndDate] = React.useState("")

    React.useEffect(() => {
        if (hasOwnDashboard) {
            return
        }
        const data = { limit: 200, page: 1 }
        dispatch(getSites(data))
        dispatch(getCustomers(data))
        if (isCustomerRole) {
            dispatch(getDashboardSummary())
            dispatch(getClosedTicketsAnalysis({}))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleApplyFilter = () => {
        dispatch(getClosedTicketsAnalysis({ startDate, endDate }))
    }

    const handleClearFilter = () => {
        setStartDate("")
        setEndDate("")
        dispatch(getClosedTicketsAnalysis({}))
    }

    if (!hasOwnDashboard && (getSiteError || getCustomerError)) {
        return <Alert severity="error">Unable to load</Alert>
    }
    if (!hasOwnDashboard && (getCustomerStatus !== pageStatusVals.fetched || getSiteStatus !== pageStatusVals.fetched)) {
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
                ) : isScx ? (
                    <Grid item xs={12}>
                        <ScxDashboard />
                    </Grid>
                ) : isCustomerRole ? (
                    <>
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

                        <Grid item xs={12} sm={6}>
                            <StatTile title="Total Tickets Closed" value={_.get(closedTicketsAnalysis, "totalClosed", 0)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <CountChart title="Category Wise Tickets" data={_.get(closedTicketsAnalysis, "categoryWise", [])} />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography component="h3" variant="subtitle1" sx={{ mt: 0.5, fontSize: "1rem" }}>Filter By</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Paper sx={{ p: 1 }}>
                                <Grid container spacing={1} alignItems="center">
                                    <Grid item xs={12} sm={4}>
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
                                    <Grid item xs={12} sm={4}>
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
                                    <Grid item xs={12} sm={4} sx={{ display: "flex", gap: 1 }}>
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
