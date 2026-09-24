import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import TextField from "@mui/material/TextField"
import { useSelector, useDispatch } from "react-redux"
import DeliveryOrderTable from "./DeliveryOrderTable"
import CreateDeliveryOrder from "./CreateDeliveryOrder"
import BulkUploadDeliveryOrders from "./BulkUploadDeliveryOrders"
import {
    getDeliveryOrders,
    selectOpenOrderList,
    selectDeliveredOrderList,
    selectPagination,
    selectSearch,
    setSearch,
} from "./deliveryOrderSlice"
import { fetchDeletedDeliveryOrders, fetchRestoreDeliveryOrder, fetchPermanentlyDeleteDeliveryOrder } from "./deliveryOrderAPI"
import { getVendors } from "../vendors/vendorSlice"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import DeletedRecordsPanel from "../../components/DeletedRecordsPanel"

const deletedOrderColumns = [
    { id: "orderId", label: "Order ID" },
    { id: "customer.name", label: "Customer" },
    { id: "newCustomerName", label: "New Customer" },
    { id: "siteAddress", label: "Site Address" },
]

// SCX Service Delivery's own module (also reachable read-only through the
// SCX Management dashboard's Delivery tab - see ManagementDashboard.js).
// createDeliveryOrders/updateDeliveryOrders/bulkUpload are held by SCX Admin
// and SCX Service Delivery (see roles.js) - SCX Management has none of them,
// so New Order/Bulk Upload Orders are left out of the tab list entirely for
// it, same pattern as Tickets.js/Opportunities.js/Customers.js. Deletion
// ("Remove Delete option for Order for Delivery User, should only with SCX
// Admin") is narrower still - SCX Admin only, so Deleted Orders and each
// row's own Delete icon are gated separately from the rest of canManage.
export default function DeliveryOrders() {
    const dispatch = useDispatch()
    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN
    const canManage = isAdmin || currentUser.role === roles.SCLOUDX_SERVICE_DELIVERY

    const openOrderList = useSelector(selectOpenOrderList)
    const deliveredOrderList = useSelector(selectDeliveredOrderList)
    const pagination = useSelector(selectPagination)
    const search = useSelector(selectSearch)

    const [value, setValue] = React.useState(0)
    const [searchInput, setSearchInput] = React.useState(search)

    // "Whenever any tab is pressed, reset all Search selections" - View
    // Open Order and Delivered Orders share this one search box/Redux term,
    // so switching straight between them (not just away and back) left the
    // old term applied to whichever list was landed on.
    const handleChange = (event, newValue) => {
        setSearchInput("")
        dispatch(setSearch(""))
        setValue(newValue)
    }

    // Re-fetches both lists whenever page, limit, or the committed search
    // term changes - simpler than tracking which tab is active, and each
    // fetch is cheap (limit 1000, matching every other "no page limit" list
    // in this app).
    React.useEffect(() => {
        dispatch(getDeliveryOrders({ limit: pagination.limit, page: pagination.page + 1, search, tab: "open" }))
        dispatch(getDeliveryOrders({ limit: pagination.limit, page: pagination.page + 1, search, tab: "completed" }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit, search])

    // The row/details Vendor Name comes from this list too (see
    // DeliveryOrderTable.js's vendorNameById) - fetched here rather than
    // only from the New Order tab, so it's populated even for someone who
    // lands straight on View Open Order and never opens New Order.
    React.useEffect(() => {
        dispatch(getVendors({ limit: 1000, page: 1 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Debounce the search box: only commit to Redux (and trigger the fetch
    // above) 400ms after the user stops typing.
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchInput !== search) {
                dispatch(setSearch(searchInput))
            }
        }, 400)
        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput])

    const searchBox = (
        <TextField
            fullWidth
            label="Search delivery orders"
            placeholder="Search by Order ID, Serial Number, customer, SCloudX Order Ref, site address, city, Customer PO, Vendor, Vendor Circuit ID or notes"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            sx={{ mb: 2 }}
        />
    )

    const tabs = [
        {
            label: "View Open Order",
            content: (
                <>
                    {searchBox}
                    <DeliveryOrderTable rows={openOrderList} canEdit={canManage} canDelete={isAdmin} />
                </>
            ),
        },
    ]

    if (canManage) {
        tabs.push({ label: "New Order", content: <CreateDeliveryOrder /> })
    }

    tabs.push({
        label: "Delivered Orders",
        content: (
            <>
                {searchBox}
                {/* "Make Delivered Order Non Editable to everyone except SCX
                    Admin" - narrower than canManage (which also covers SCX
                    Service Delivery) on this one tab only; View Open Order
                    keeps the wider canManage. "Replace Status with Delivery
                    Date" - every row here is already Status "Completed", so
                    Delivery Date is the actually-varying column instead. */}
                <DeliveryOrderTable rows={deliveredOrderList} canEdit={isAdmin} canDelete={isAdmin} showDeliveryDate />
            </>
        ),
    })

    if (isAdmin) {
        tabs.push({
            label: "Deleted Orders",
            content: (
                <DeletedRecordsPanel
                    columns={deletedOrderColumns}
                    fetchDeleted={fetchDeletedDeliveryOrders}
                    restoreRecord={fetchRestoreDeliveryOrder}
                    permanentlyDeleteRecord={fetchPermanentlyDeleteDeliveryOrder}
                    entityLabel="order"
                />
            ),
        })
    }

    if (canManage) {
        tabs.push({ label: "Bulk Upload Orders", content: <BulkUploadDeliveryOrders /> })
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Tabs value={value} onChange={handleChange} aria-label="delivery orders">
                        {tabs.map((tab) => (
                            <Tab key={tab.label} label={tab.label} />
                        ))}
                    </Tabs>
                </Grid>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, display: "flex", flexDirection: "column" }}>
                        {tabs[value] ? tabs[value].content : tabs[0].content}
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    )
}
