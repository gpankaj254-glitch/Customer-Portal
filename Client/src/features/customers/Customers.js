import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import TextField from "@mui/material/TextField"

import CustomerTable from "./CustomerTable"
import {
    selectPagination,
    selectSearch as selectCustomerSearch,
    getCustomers,
    setSearch as setCustomerSearch,
} from "./customerSlice"
import { useSelector, useDispatch } from "react-redux"
import CreateCustomer from "./CreateCustomer"
import { fetchDeletedCustomers, fetchRestoreCustomer, fetchPermanentlyDeleteCustomer } from "./customerAPI"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import DeletedRecordsPanel from "../../components/DeletedRecordsPanel"

const deletedCustomerColumns = [
    { id: "name", label: "Customer Name" },
    { id: "code", label: "Customer Identifier" },
]

function CustomersContent() {

    const dispatch = useDispatch()
    const pagination = useSelector(selectPagination)
    const customerSearch = useSelector(selectCustomerSearch)
    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN
    // SCX NOC no longer creates customers here ("Remove Create Customer ...
    // rights from NOC") - SCX Admin and SCX Service Delivery both hold
    // createCustomers (see roles.js) - Service Delivery gets the tab here
    // too, on top of the inline "Create Customer" it already has while
    // completing a Delivery Order (see OrderDetails.js). Create Customer is
    // left out of the tab list entirely for anyone else rather than shown
    // and then rejected by the server.
    const canCreateCustomer = isAdmin || currentUser.role === roles.SCLOUDX_SERVICE_DELIVERY
    const [value, setValue] = React.useState(0)
    // Local, uncommitted text box value - kept separate from the Redux
    // search term so we can debounce before actually dispatching a fetch.
    const [customerSearchInput, setCustomerSearchInput] = React.useState(customerSearch)

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    // Customers: re-fetches whenever page, limit, or the committed search
    // term changes.
    React.useEffect(() => {
        dispatch(getCustomers({
            limit: pagination.limit,
            page: pagination.page + 1,
            search: customerSearch,
        }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit, customerSearch])

    // Debounce the search box: only commit to Redux (and trigger the fetch
    // above) 400ms after the user stops typing.
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            if (customerSearchInput !== customerSearch) {
                dispatch(setCustomerSearch(customerSearchInput))
            }
        }, 400)
        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerSearchInput])

    const tabs = [
        {
            label: "Customer List",
            content: (
                <>
                    <TextField
                        fullWidth
                        label="Search customers"
                        placeholder="Search by customer name or identifier"
                        value={customerSearchInput}
                        onChange={(event) => setCustomerSearchInput(event.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <CustomerTable pagination={pagination} />
                </>
            ),
        },
    ]

    if (canCreateCustomer) {
        tabs.push({ label: "Create Customer", content: <CreateCustomer /> })
    }

    if (isAdmin) {
        tabs.push({
            label: "Deleted Customers",
            content: (
                <DeletedRecordsPanel
                    columns={deletedCustomerColumns}
                    fetchDeleted={fetchDeletedCustomers}
                    restoreRecord={fetchRestoreCustomer}
                    permanentlyDeleteRecord={fetchPermanentlyDeleteCustomer}
                    entityLabel="customer"
                />
            ),
        })
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>

                <Grid item xs={12}>
                    <Tabs value={value} onChange={handleChange} aria-label="customer management">
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

export default function Customers() {
    return <CustomersContent />
}
