import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import TextField from "@mui/material/TextField"
// import Typography from "@mui/material/Typography"

import UserTable from "./UserTable"
import { selectPagination, selectSearch, setSearch } from "./userSlice"
import { useSelector, useDispatch } from "react-redux"
import { getCustomers } from "../customers/customerSlice"
import { getVendors } from "../vendors/vendorSlice"
import CreateUser from "./CreateUser"
import { getUsers } from "./userSlice"
import { fetchDeletedUsers, fetchRestoreUser, fetchPermanentlyDeleteUser } from "./userAPI"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import DeletedRecordsPanel from "../../components/DeletedRecordsPanel"

const deletedUserColumns = [
    { id: "name", label: "User Name" },
    { id: "email", label: "User Email" },
    { id: "role", label: "User Role" },
    { id: "description", label: "Description" },
]

function UsersContent() {

    // const errorMessage = useSelector(selectGetUsersError)
    const dispatch = useDispatch()
    const pagination = useSelector(selectPagination)
    const search = useSelector(selectSearch)
    const currentUser = useSelector(selectUser)
    // Customer Admins manage their own customer's users the same way SCX
    // Admins manage everyone's - scoped server-side to their own customer.
    // SCX Sales Admins are scoped the same way, down to Sales Admin/User
    // accounts only (see getUsers/getDeletedUsers on the server).
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN || currentUser.role === roles.CUSTOMER_ADMIN || currentUser.role === roles.SCLOUDX_SALES_ADMIN
    // Permanently deleting a user from the database is SCX-only - Customer
    // Admins keep restore/soft-delete but never this, both here and
    // server-side (permanentlyDeleteUsers is only granted to scloudxAdmin).
    const isScxAdmin = currentUser.role === roles.SCLOUDX_ADMIN

    const [value, setValue] = React.useState(0)
    // Local, uncommitted text box value - kept separate from the Redux
    // search term so we can debounce before actually dispatching a fetch.
    const [searchInput, setSearchInput] = React.useState(search)

    const handleChange = (event, newValue) => {
        console.log(newValue)
        setValue(newValue)
    }

    // Populate the customer/vendor dropdowns used by CreateUser once on mount.
    React.useEffect(() => {
        dispatch(getCustomers({ limit: pagination.limit, page: 1 }))
        dispatch(getVendors({ limit: 200, page: 1 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Users: re-fetches whenever page, limit, or the committed search term
    // changes, and also whenever the User List tab is (re)selected - a user
    // created or restored from the other tabs only updates this Redux list
    // through this fetch, since CreateUser/DeletedRecordsPanel don't (and
    // for DeletedRecordsPanel, can't - it's a generic component) write into
    // it directly.
    React.useEffect(() => {
        if (value !== 0) {
            return
        }
        dispatch(getUsers({
            limit: pagination.limit,
            page: pagination.page + 1,
            search,
        }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit, search, value])

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

    const tabs = [
        {
            label: "User List",
            content: (
                <>
                    <TextField
                        fullWidth
                        label="Search users"
                        placeholder="Search by name or email"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <UserTable pagination = {pagination}/>
                </>
            ),
        },
        { label: "Create User", content: <CreateUser/> },
    ]

    if (isAdmin) {
        tabs.push({
            label: "Deleted Users",
            content: (
                <DeletedRecordsPanel
                    columns={deletedUserColumns}
                    fetchDeleted={fetchDeletedUsers}
                    restoreRecord={fetchRestoreUser}
                    permanentlyDeleteRecord={isScxAdmin ? fetchPermanentlyDeleteUser : null}
                    entityLabel="user"
                />
            ),
        })
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Tabs value={value} onChange={handleChange} aria-label="user management">
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
    // }
}

export default function Users() {
    return <UsersContent />
}
