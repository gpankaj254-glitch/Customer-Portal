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
import { getCircuitsList, selectCircuitsList } from "../inventory/circuitSlice"
import { selectVendorList } from "../vendors/vendorSlice"

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
    // "Add 5 Bar Charts; Live Circuit by Customer, Product, Bandwidth,
    // Vendor, Country" - vendorList is already fetched by
    // ManagementDashboard.js itself (same as openOrderList above); the Live
    // circuit list is fetched here, same call FinanceDashboard.js's own
    // table already makes.
    const circuitsList = useSelector(selectCircuitsList)
    const vendorList = useSelector(selectVendorList)

    React.useEffect(() => {
        dispatch(getDashboardSummary())
        dispatch(getSalesDashboardSummary())
        dispatch(getOpenTicketsAnalysis())
        dispatch(getCircuitsList({ search: "", statuses: ["Live"] }))
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

    const vendorNameById = React.useMemo(
        () => new Map(vendorList.map((vendor) => [vendor.id, vendor.name])),
        [vendorList]
    )

    // "Add 5 Bar Charts; Live Circuit by Customer, Product, Bandwidth,
    // Vendor, Country" - each just a breakdown of the same Live circuit
    // list fetched above, one dimension per chart.
    const circuitsByCustomer = React.useMemo(
        () => groupCounts(circuitsList, (circuit) => _.get(circuit, "customer.name")),
        [circuitsList]
    )
    const circuitsByProduct = React.useMemo(
        () => groupCounts(circuitsList, (circuit) => circuit.product),
        [circuitsList]
    )
    const circuitsByBandwidth = React.useMemo(
        () => groupCounts(circuitsList, (circuit) => circuit.bandwidth),
        [circuitsList]
    )
    const circuitsByVendor = React.useMemo(
        () => groupCounts(circuitsList, (circuit) => vendorNameById.get(circuit.vendorId) || ""),
        [circuitsList, vendorNameById]
    )
    const circuitsByCountry = React.useMemo(
        () => groupCounts(circuitsList, (circuit) => _.get(circuit, "location.country")),
        [circuitsList]
    )

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
            {/* "Add 5 Bar Charts; Live Circuit by Customer, Product,
                Bandwidth, Vendor, Country" - own set of rows below the
                three above (xs=12 sm=4 wraps 3-then-2, same idea as the row
                above it). */}
            <Grid item xs={12} sm={4}>
                <CountChart compact title="Live Circuits - Customer wise" data={circuitsByCustomer} />
            </Grid>
            <Grid item xs={12} sm={4}>
                <CountChart compact title="Live Circuits - Product wise" data={circuitsByProduct} />
            </Grid>
            <Grid item xs={12} sm={4}>
                <CountChart compact title="Live Circuits - Bandwidth wise" data={circuitsByBandwidth} />
            </Grid>
            {/* "Change Live Circuits Vendor wise and Live Circuits Country
                wise in Horizontal Bars" - sm=6 each (rather than sm=4 like
                the row above) since a horizontal chart needs more width for
                its own category labels + numeric axis, and these two grow
                tall (one row per vendor/country) rather than wide, so
                pairing them side by side reads better than a 3-up row. */}
            <Grid item xs={12} sm={6}>
                <CountChart compact horizontal title="Live Circuits - Vendor wise" data={circuitsByVendor} />
            </Grid>
            <Grid item xs={12} sm={6}>
                <CountChart compact horizontal title="Live Circuits - Country wise" data={circuitsByCountry} />
            </Grid>
        </Grid>
    )
}
