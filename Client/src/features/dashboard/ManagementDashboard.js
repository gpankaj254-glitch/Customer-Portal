import * as React from "react"
import Grid from "@mui/material/Grid"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import SalesDashboard from "../opportunities/SalesDashboard"
import FinanceDashboard from "./FinanceDashboard"
import ScxDashboard from "./ScxDashboard"
import Customers from "../customers/Customers"
import Sites from "../sites/Sites"
import Inventory from "../inventory/Inventory"
import Vendors from "../vendors/Vendors"
import DeliveryOrders from "../delivery/DeliveryOrders"

const TAB_LABELS = ["Sales", "Finance", "Delivery", "NOC"]

// SCX Service Delivery has no dashboard summary of its own - it's given
// Customer Management, Site Management, Inventory Management, Vendor
// Management and Service Delivery Management instead (see permissions.js),
// same five pages an SCX Service Delivery user would see in their own side
// menu, under their own sub-tabs here.
const DELIVERY_TAB_LABELS = ["Customers", "Sites", "Inventory", "Vendors", "Service Delivery Management"]

// SCX Management's dashboard: each tab is that role's own dashboard/pages,
// unchanged - Sales is SalesDashboard (SCX Sales), Finance is
// FinanceDashboard (SCX Finance), NOC is ScxDashboard (SCX NOC, the renamed
// SCX User), Delivery is SCX Service Delivery's three pages (see above).
export default function ManagementDashboard() {
    const [activeTab, setActiveTab] = React.useState(0)
    const [deliveryTab, setDeliveryTab] = React.useState(0)

    return (
        <Grid container spacing={1.5}>
            <Grid item xs={12}>
                <Tabs
                    value={activeTab}
                    onChange={(event, newValue) => setActiveTab(newValue)}
                    aria-label="management dashboard"
                    sx={{ minHeight: 34, "& .MuiTab-root": { minHeight: 34, py: 0.5, fontSize: "0.75rem" } }}
                >
                    {TAB_LABELS.map((label) => (
                        <Tab key={label} label={label} />
                    ))}
                </Tabs>
            </Grid>
            <Grid item xs={12}>
                {activeTab === 0 && <SalesDashboard />}
                {activeTab === 1 && <FinanceDashboard />}
                {activeTab === 2 && (
                    <Grid container spacing={1.5}>
                        <Grid item xs={12}>
                            <Tabs
                                value={deliveryTab}
                                onChange={(event, newValue) => setDeliveryTab(newValue)}
                                aria-label="delivery"
                                sx={{ minHeight: 34, "& .MuiTab-root": { minHeight: 34, py: 0.5, fontSize: "0.75rem" } }}
                            >
                                {DELIVERY_TAB_LABELS.map((label) => (
                                    <Tab key={label} label={label} />
                                ))}
                            </Tabs>
                        </Grid>
                        <Grid item xs={12}>
                            {deliveryTab === 0 && <Customers />}
                            {deliveryTab === 1 && <Sites />}
                            {deliveryTab === 2 && <Inventory />}
                            {deliveryTab === 3 && <Vendors />}
                            {deliveryTab === 4 && <DeliveryOrders />}
                        </Grid>
                    </Grid>
                )}
                {activeTab === 3 && <ScxDashboard />}
            </Grid>
        </Grid>
    )
}
