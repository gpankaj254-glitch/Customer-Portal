import * as React from "react"
import Grid from "@mui/material/Grid"
import _ from "lodash"
import { useDispatch, useSelector } from "react-redux"
import { StatTile, CountChart } from "./DashboardWidgets"
import {
    getDashboardSummary,
    getOpenTicketsAnalysis,
    selectDashboardSummary,
    selectOpenTicketsAnalysis,
} from "./dashboardSlice"
import { getSalesDashboardSummary, selectSalesDashboardSummary } from "../opportunities/opportunitySlice"
import { selectOpenOrderList } from "../delivery/deliveryOrderSlice"
import { customerName } from "../delivery/DeliveryOrderTable"
import { groupCounts } from "./DeliveryOrderCharts"

// "Main Dashboard - Add Summary Tab; Show - Total Customers, Total Live
// Circuits, Sales - total Open Opportunities, Delivery, Total Open Orders
// Customer Wise and Total, NOC Open Tickets and Open Tickets with Status -
// InProgress" (SCX Admin/Management's Main Dashboard - see
// ManagementDashboard.js, this tab's new first tab). Every number reuses
// data each area's own tab already fetches/computes elsewhere in this app -
// this component only adds the handful of fetches not already dispatched by
// ManagementDashboard (getDashboardSummary/getSalesDashboardSummary/
// getOpenTicketsAnalysis); Delivery's openOrderList is already fetched by
// ManagementDashboard itself, so it isn't re-fetched here.
export default function DashboardSummary() {
    const dispatch = useDispatch()
    const summary = useSelector(selectDashboardSummary)
    const salesSummary = useSelector(selectSalesDashboardSummary)
    const openTicketsAnalysis = useSelector(selectOpenTicketsAnalysis)
    const openOrderList = useSelector(selectOpenOrderList)

    React.useEffect(() => {
        dispatch(getDashboardSummary())
        dispatch(getSalesDashboardSummary())
        dispatch(getOpenTicketsAnalysis())
    }, [dispatch])

    const statusWise = _.get(openTicketsAnalysis, "statusWise", [])
    const inProgressCount = _.get(_.find(statusWise, { name: "InProgress" }), "count", 0)
    const totalOpenTickets = _.get(openTicketsAnalysis, "tickets.length", 0)
    const customerWiseOrders = React.useMemo(() => groupCounts(openOrderList, customerName), [openOrderList])

    return (
        <Grid container spacing={1.5}>
            <Grid item xs={6} sm={4} md={2}>
                <StatTile compact title="Total Customers" value={_.get(summary, "activeCustomers", 0)} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
                <StatTile compact title="Total Live Circuits" value={_.get(summary, "activeCircuits", 0)} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
                <StatTile compact title="Sales - Total Open Opportunities" value={_.get(salesSummary, "totalOpenOpportunities", 0)} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
                <StatTile compact title="Delivery - Total Open Orders" value={openOrderList.length} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
                <StatTile compact title="NOC - Total Open Tickets" value={totalOpenTickets} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
                <StatTile compact title="NOC - Open Tickets (InProgress)" value={inProgressCount} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <CountChart compact title="Open Orders - Customer wise" data={customerWiseOrders} />
            </Grid>
        </Grid>
    )
}
