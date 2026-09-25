import * as React from "react"
import Grid from "@mui/material/Grid"
import PropTypes from "prop-types"
import { useSelector } from "react-redux"
import { CountChart } from "./DashboardWidgets"
import { customerName, currentMilestoneStatus } from "../delivery/DeliveryOrderTable"
import { selectVendorList } from "../vendors/vendorSlice"

// One bucket per distinct label, sorted highest count first (bar charts read
// better with the tallest/most significant bars up front) - "Not set" covers
// a blank value (e.g. End User never filled in) rather than dropping it
// silently from the chart.
export function groupCounts(orders, getLabel) {
    const counts = new Map()
    orders.forEach((order) => {
        const label = getLabel(order) || "Not set"
        counts.set(label, (counts.get(label) || 0) + 1)
    })
    return Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
}

// "In delivery Dashboard, Create Customerwise, End Userwise, Vendorwise,
// Status wise and Milestonewise Chart for Open Orders" - reused identically
// on all three places Open Orders shows up on a dashboard (Dashboard.js's
// own Delivery role branch, ScxDashboard.js's Delivery tab,
// ManagementDashboard.js's Delivery tab - same as DeliveryOrderTable.js
// itself already is), right above that same table. Customer wise/Milestone
// wise reuse DeliveryOrderTable.js's own customerName/currentMilestoneStatus
// helpers rather than re-deriving them, so a Milestone Status shown here
// always matches what the table below it shows for the same order.
export default function DeliveryOrderCharts({ orders }) {
    const vendorList = useSelector(selectVendorList)
    const vendorNameById = React.useMemo(
        () => new Map(vendorList.map((vendor) => [vendor.id, vendor.name])),
        [vendorList]
    )

    const customerWise = React.useMemo(() => groupCounts(orders, customerName), [orders])
    const endUserWise = React.useMemo(() => groupCounts(orders, (order) => order.endUser), [orders])
    const vendorWise = React.useMemo(
        () => groupCounts(orders, (order) => vendorNameById.get(order.vendorId) || ""),
        [orders, vendorNameById]
    )
    const statusWise = React.useMemo(() => groupCounts(orders, (order) => order.status), [orders])
    const milestoneWise = React.useMemo(() => groupCounts(orders, currentMilestoneStatus), [orders])

    return (
        <>
            <Grid item xs={12} sm={6}>
                <CountChart compact title="Open Orders - Customer wise" data={customerWise} />
            </Grid>
            <Grid item xs={12} sm={6}>
                <CountChart compact title="Open Orders - End User wise" data={endUserWise} />
            </Grid>
            <Grid item xs={12} sm={6}>
                <CountChart compact title="Open Orders - Vendor wise" data={vendorWise} />
            </Grid>
            <Grid item xs={12} sm={6}>
                <CountChart compact title="Open Orders - Status wise" data={statusWise} />
            </Grid>
            <Grid item xs={12} sm={6}>
                <CountChart compact title="Open Orders - Milestone wise" data={milestoneWise} />
            </Grid>
        </>
    )
}

DeliveryOrderCharts.propTypes = {
    orders: PropTypes.array.isRequired,
}
