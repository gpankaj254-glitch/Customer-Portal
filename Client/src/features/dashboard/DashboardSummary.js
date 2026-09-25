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
// Circuits, Sales - total Open Opportunities in Bar Chart, Delivery - Total
// Open Orders and Customer Wise in Bar Chart, NOC - Total Open Tickets and
// Open Tickets with Status - InProgress in Bar Chart" (SCX Admin/Management's
// Main Dashboard - see ManagementDashboard.js, this tab's own first tab).
// Every number reuses data each area's own tab already fetches/computes
// elsewhere in this app - this component only adds the handful of fetches
// not already dispatched by ManagementDashboard
// (getDashboardSummary/getSalesDashboardSummary/getOpenTicketsAnalysis);
// Delivery's openOrderList is already fetched by ManagementDashboard itself.
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
    const totalOpenOpportunities = _.get(salesSummary, "totalOpenOpportunities", 0)

    // "Sales - total Open Opportunities in Bar Chart" - a single-bar chart,
    // for visual consistency with Delivery/NOC's own bar charts below rather
    // than a plain number tile.
    const salesChartData = React.useMemo(() => (
        [{ name: "Total Open Opportunities", count: totalOpenOpportunities }]
    ), [totalOpenOpportunities])

    // "Delivery - Total Open Orders and Customer Wise in Bar Chart" - one
    // chart, Total as its own bar alongside the customer-wise breakdown.
    const deliveryChartData = React.useMemo(() => (
        [{ name: "Total Open Orders", count: openOrderList.length }, ...groupCounts(openOrderList, customerName)]
    ), [openOrderList])

    // "NOC - Total Open Tickets and Open Tickets with Status - InProgress in
    // Bar Chart" - one chart, both numbers as their own bars.
    const nocChartData = React.useMemo(() => (
        [{ name: "Total Open Tickets", count: totalOpenTickets }, { name: "InProgress", count: inProgressCount }]
    ), [totalOpenTickets, inProgressCount])

    return (
        <Grid container spacing={1.5}>
            {/* Own row (xs=6 each sum to 12) so the bar charts below always
                start a fresh row rather than sharing this one. */}
            <Grid item xs={6}>
                <StatTile compact title="Total Customers" value={_.get(summary, "activeCustomers", 0)} />
            </Grid>
            <Grid item xs={6}>
                <StatTile compact title="Total Live Circuits" value={_.get(summary, "activeCircuits", 0)} />
            </Grid>
            {/* "Align all Bar Charts in one row" - xs=4 each (summing to 12)
                guarantees all three stay on one row from the sm breakpoint
                up, rather than wrapping under the two stat tiles above. */}
            <Grid item xs={12} sm={4}>
                <CountChart compact title="Sales - Open Opportunities" data={salesChartData} />
            </Grid>
            <Grid item xs={12} sm={4}>
                <CountChart compact title="Delivery - Open Orders" data={deliveryChartData} />
            </Grid>
            <Grid item xs={12} sm={4}>
                <CountChart compact title="NOC - Open Tickets" data={nocChartData} />
            </Grid>
        </Grid>
    )
}
