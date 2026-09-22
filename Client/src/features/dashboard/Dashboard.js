import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import Link from "@mui/material/Link"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import { Alert } from "@mui/material"
import PropTypes from "prop-types"
import _ from "lodash"

import { StatTile } from "./DashboardWidgets"
import {getSites, selectGetSiteError, selectPageStatus as selectGetSiteStatus, selectSiteList} from "../inventory/inventorySlice"
import { getCustomers, selectGetCustomersError, selectPageStatus as selectGetCustomerStatus } from "../customers/customerSlice"
import {
    getDashboardSummary,
    getOpenTicketsAnalysis,
    selectDashboardSummary,
    selectOpenTicketsAnalysis,
    selectOpenTicketsAnalysisError,
} from "./dashboardSlice"
import { focusTicket } from "../tickets/ticketSlice"
import { togglePage } from "../landing/landingSlice"

import { useSelector, useDispatch } from "react-redux"
import { selectUser } from "../auth/authSlice"
import { pages, roles } from "../../consts"
import { pageStatusVals } from "../tickets/utils"
import { getFormattedDateTimeGMT } from "../../utils/dates"
import SalesDashboard from "../opportunities/SalesDashboard"
import ScxDashboard from "./ScxDashboard"
import CustomerClosedTickets from "./CustomerClosedTickets"
import FinanceDashboard from "./FinanceDashboard"
import ManagementDashboard from "./ManagementDashboard"
import { getDeliveryOrders, selectOpenOrderList } from "../delivery/deliveryOrderSlice"
import { getVendors } from "../vendors/vendorSlice"
import DeliveryOrderTable from "../delivery/DeliveryOrderTable"

const openTicketColumns = [
    "Ticket ID",
    "Customer Reference",
    "Problem Type",
    "Ticket Create Date (GMT)",
    "Ticket Status",
]

// The customer's own open tickets (the server scopes the list to their
// customer). Same layout and Ticket ID link as the SCX dashboard's Open
// Tickets tab, minus the vendor columns.
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
                            <TableCell key={label} sx={{ fontWeight: 600 }}>{label}</TableCell>
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
                            <TableCell>{row.problemType}</TableCell>
                            <TableCell>{getFormattedDateTimeGMT(row.createdAt)}</TableCell>
                            <TableCell>{row.status}</TableCell>
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

function DashboardContent() {
    const dispatch = useDispatch()
    const user = useSelector(selectUser)
    // SCX NOC alone gets the plain ScxDashboard - SCX Admin now gets the
    // same rolled-up ManagementDashboard as SCX Management ("SCX Admin
    // Dashboard should be same as SCX Management role"), which itself
    // embeds ScxDashboard as its own NOC tab.
    const isNoc = user.role === roles.SCLOUDX_USER
    const isAdmin = user.role === roles.SCLOUDX_ADMIN
    const isCustomerRole = user.role === roles.CUSTOMER_ADMIN || user.role === roles.CUSTOMER_USER
    const isSalesRole = user.role === roles.SCLOUDX_SALES_ADMIN || user.role === roles.SCLOUDX_SALES_USER
    const isFinance = user.role === roles.SCLOUDX_FINANCE
    const isManagement = user.role === roles.SCLOUDX_MANAGEMENT
    const isDeliveryRole = user.role === roles.SCLOUDX_SERVICE_DELIVERY
    // SalesDashboard, ScxDashboard, FinanceDashboard and ManagementDashboard
    // fetch their own data; every other role (Customer Admin/User, and the
    // plain fallback) uses the site/customer fetches and layout below.
    const hasOwnDashboard = isSalesRole || isNoc || isAdmin || isFinance || isManagement || isDeliveryRole

    const getSiteError = useSelector(selectGetSiteError)
    const getCustomerError = useSelector(selectGetCustomersError)
    const getCustomerStatus = useSelector(selectGetCustomerStatus)
    const getSiteStatus = useSelector(selectGetSiteStatus)
    const siteList = useSelector(selectSiteList)

    const summary = useSelector(selectDashboardSummary)
    const openAnalysis = useSelector(selectOpenTicketsAnalysis)
    const openAnalysisError = useSelector(selectOpenTicketsAnalysisError)
    const openOrderList = useSelector(selectOpenOrderList)
    // Dashboard state isn't cleared on logout, so a previous user's open
    // tickets could still be in the store - only show the list once this
    // visit's own request has come back.
    const [openTicketsLoaded, setOpenTicketsLoaded] = React.useState(false)
    // Customer Admin/User dashboard tabs: 0 = Main Dashboard, 1 = Closed Tickets.
    const [customerTab, setCustomerTab] = React.useState(0)

    React.useEffect(() => {
        if (hasOwnDashboard) {
            return
        }
        const data = { limit: 200, page: 1 }
        dispatch(getSites(data))
        dispatch(getCustomers(data))
        if (isCustomerRole) {
            dispatch(getDashboardSummary())
            dispatch(getOpenTicketsAnalysis()).then(() => setOpenTicketsLoaded(true))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // "Show View Open Orders in Dashboard for Delivery role" - same
    // openOrderList/vendor data the Service Delivery Management module
    // itself uses (see DeliveryOrders.js), fetched here too since a Service
    // Delivery user may land on the Dashboard first.
    React.useEffect(() => {
        if (!isDeliveryRole) {
            return
        }
        dispatch(getDeliveryOrders({ limit: 1000, page: 1, search: "", tab: "open" }))
        dispatch(getVendors({ limit: 1000, page: 1 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDeliveryRole])

    // Sends the user to Tickets > View Open Ticket with this ticket's details
    // expanded (see ticketSlice's focusTicket and TicketsTable) - same as the
    // SCX dashboard.
    const handleOpenTicket = (ticketId) => {
        dispatch(focusTicket(ticketId))
        dispatch(togglePage(pages.TICKETS))
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
                    <Typography component="h1" variant="h1" sx={{ fontSize: isCustomerRole ? "1.1rem" : "1.5rem" }}>
                        Welcome, {user.name} !!
                    </Typography>
                </Grid>

                {isSalesRole ? (
                    <Grid item xs={12}>
                        <SalesDashboard />
                    </Grid>
                ) : isNoc ? (
                    <Grid item xs={12}>
                        <ScxDashboard />
                    </Grid>
                ) : isFinance ? (
                    <Grid item xs={12}>
                        <FinanceDashboard />
                    </Grid>
                ) : isManagement || isAdmin ? (
                    <Grid item xs={12}>
                        <ManagementDashboard />
                    </Grid>
                ) : isDeliveryRole ? (
                    <>
                        <Grid item xs={12}>
                            <Typography component="h2" variant="h5" sx={{ mt: 0.5, fontSize: "0.85rem", fontWeight: 600 }}>View Open Orders</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            {/* "Remove Delete option for Order for Delivery User,
                                should only with SCX Admin" - canDelete omitted here
                                (defaults false), unlike SCX Admin's own equivalent
                                Dashboard tab in ScxDashboard.js. */}
                            <DeliveryOrderTable rows={openOrderList} canEdit dashboardView />
                        </Grid>
                    </>
                ) : isCustomerRole ? (
                    <>
                        <Grid item xs={12}>
                            <Tabs
                                value={customerTab}
                                onChange={(event, newValue) => setCustomerTab(newValue)}
                                aria-label="dashboard"
                                sx={{ minHeight: 34, "& .MuiTab-root": { minHeight: 34, py: 0.5, fontSize: "0.72rem" } }}
                            >
                                <Tab label="Main Dashboard" />
                                <Tab label="Closed Tickets" />
                            </Tabs>
                        </Grid>
                        {customerTab === 1 ? (
                            <Grid item xs={12}>
                                <CustomerClosedTickets />
                            </Grid>
                        ) : (
                            <>
                        <Grid item xs={12} sm={6} md={4}>
                            <StatTile compact title="Active Sites" value={_.get(summary, "activeSites", 0)} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <StatTile compact title="Active Circuits" value={_.get(summary, "activeCircuits", 0)} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <StatTile compact title="Open Tickets" value={_.get(summary, "openTickets", 0)} />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography component="h2" variant="h5" sx={{ mt: 0.5, fontSize: "0.85rem", fontWeight: 600 }}>Open Tickets</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            {openAnalysisError ? (
                                <Alert severity="error">Unable to load open tickets</Alert>
                            ) : !openTicketsLoaded || !openAnalysis ? (
                                <Typography variant="body2" sx={{ fontSize: "0.72rem" }}>Loading...</Typography>
                            ) : (
                                <OpenTicketsTable rows={_.get(openAnalysis, "tickets", [])} onOpenTicket={handleOpenTicket} />
                            )}
                        </Grid>
                            </>
                        )}
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
