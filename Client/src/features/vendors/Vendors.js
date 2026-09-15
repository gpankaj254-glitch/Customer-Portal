import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import TextField from "@mui/material/TextField"

import VendorTable from "./VendorTable"
import {
    selectPagination,
    selectSearch as selectVendorSearch,
    getVendors,
    setSearch as setVendorSearch,
} from "./vendorSlice"
import { useSelector, useDispatch } from "react-redux"
import CreateVendor from "./CreateVendor"
import BulkUploadVendors from "./BulkUploadVendors"
import { fetchDeletedVendors, fetchRestoreVendor } from "./vendorAPI"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import DeletedRecordsPanel from "../../components/DeletedRecordsPanel"

const deletedVendorColumns = [
    { id: "name", label: "Vendor Name" },
    { id: "code", label: "Vendor Identifier" },
]

function VendorsContent() {

    const dispatch = useDispatch()
    const pagination = useSelector(selectPagination)
    const vendorSearch = useSelector(selectVendorSearch)
    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN
    const [value, setValue] = React.useState(0)
    // Local, uncommitted text box value - kept separate from the Redux
    // search term so we can debounce before actually dispatching a fetch.
    const [vendorSearchInput, setVendorSearchInput] = React.useState(vendorSearch)

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    // Vendors: re-fetches whenever page, limit, or the committed search
    // term changes.
    React.useEffect(() => {
        dispatch(getVendors({
            limit: pagination.limit,
            page: pagination.page + 1,
            search: vendorSearch,
        }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit, vendorSearch])

    // Debounce the search box: only commit to Redux (and trigger the fetch
    // above) 400ms after the user stops typing.
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            if (vendorSearchInput !== vendorSearch) {
                dispatch(setVendorSearch(vendorSearchInput))
            }
        }, 400)
        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vendorSearchInput])

    const tabs = [
        {
            label: "Vendor List",
            content: (
                <>
                    <TextField
                        fullWidth
                        label="Search vendors"
                        placeholder="Search by vendor name or identifier"
                        value={vendorSearchInput}
                        onChange={(event) => setVendorSearchInput(event.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <VendorTable pagination={pagination} />
                </>
            ),
        },
        { label: "Create Vendor", content: <CreateVendor /> },
    ]

    if (isAdmin) {
        tabs.push({
            label: "Deleted Vendors",
            content: (
                <DeletedRecordsPanel
                    columns={deletedVendorColumns}
                    fetchDeleted={fetchDeletedVendors}
                    restoreRecord={fetchRestoreVendor}
                    entityLabel="vendor"
                />
            ),
        })
        tabs.push({ label: "Bulk Upload", content: <BulkUploadVendors /> })
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>

                <Grid item xs={12}>
                    <Tabs value={value} onChange={handleChange} aria-label="vendor management">
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

export default function Vendors() {
    return <VendorsContent />
}
