import * as React from "react"
import Grid from "@mui/material/Grid"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import Typography from "@mui/material/Typography"
import { useDispatch, useSelector } from "react-redux"
import SalesDashboard from "../opportunities/SalesDashboard"
import FinanceDashboard from "./FinanceDashboard"
import ScxDashboard from "./ScxDashboard"
import DeliveryOrderTable from "../delivery/DeliveryOrderTable"
import { getDeliveryOrders, selectOpenOrderList } from "../delivery/deliveryOrderSlice"
import { getVendors } from "../vendors/vendorSlice"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"

const TAB_LABELS = ["Sales", "Finance", "Delivery", "NOC"]

// SCX Management's dashboard, also shared by SCX Admin ("SCX Admin
// Dashboard should be same as SCX Management role" - see Dashboard.js):
// each tab is that role's own dashboard - Sales is SalesDashboard (SCX
// Sales), Finance is FinanceDashboard (SCX Finance), NOC is ScxDashboard
// (SCX NOC, the renamed SCX User), Delivery is the same "View Open Orders"
// summary the Delivery role's own Dashboard shows (see Dashboard.js) - not
// the full Service Delivery Management module (that's reachable on its own
// via the side menu - see permissions.js) and not Customers/Sites/
// Inventory/Vendors, which were removed per "Delivery dashboard should
// have only Open Order list". SCX Admin still has full rights where it
// matters (Delivery's edit/delete, and ScxDashboard's own isAdmin check),
// unlike SCX Management, which is read-only throughout - `embedded` on
// ScxDashboard suppresses its own Delivery/Sales tabs when nested in here,
// since those already exist as this component's own top-level tabs.
export default function ManagementDashboard() {
    const dispatch = useDispatch()
    const [activeTab, setActiveTab] = React.useState(0)
    const openOrderList = useSelector(selectOpenOrderList)
    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN

    React.useEffect(() => {
        dispatch(getDeliveryOrders({ limit: 1000, page: 1, search: "", tab: "open" }))
        dispatch(getVendors({ limit: 1000, page: 1 }))
    }, [dispatch])

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
                            <Typography component="h2" variant="h5" sx={{ fontSize: "0.85rem", fontWeight: 600 }}>View Open Orders</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <DeliveryOrderTable rows={openOrderList} dashboardView canEdit={isAdmin} canDelete={isAdmin} />
                        </Grid>
                    </Grid>
                )}
                {activeTab === 3 && <ScxDashboard embedded />}
            </Grid>
        </Grid>
    )
}
