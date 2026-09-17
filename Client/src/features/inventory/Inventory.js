import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import TextField from "@mui/material/TextField"

import InventoryTable from "./InventoryTable"
import CreateCircuit from "./CreateCircuit"
import BulkUploadCircuits from "./BulkUploadCircuits"
import { selectPagination, selectSearch, getSites, setSearch } from "./inventorySlice"
import { getVendors } from "../vendors/vendorSlice"
import { fetchDeletedCircuits, fetchRestoreCircuit, fetchPermanentlyDeleteCircuit } from "./circuitAPI"
import { useSelector, useDispatch } from "react-redux"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import DeletedRecordsPanel from "../../components/DeletedRecordsPanel"

const deletedCircuitColumns = [
    { id: "vendorCircuitId", label: "Vendor Circuit Id" },
    { id: "customerCircuitId", label: "Customer Circuit Id" },
    { id: "site.name", label: "Site" },
    { id: "customer.name", label: "Customer" },
]

function InventoryContent() {

    const dispatch = useDispatch()
    const [openInventoryTable, setOpenInventoryTable] = React.useState(true)
    const [value, setValue] = React.useState(0)

    function handleToggleInventoryTable(){
        setOpenInventoryTable(!openInventoryTable)
    }

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    const pagination = useSelector(selectPagination)
    const search = useSelector(selectSearch)
    const currentUser = useSelector(selectUser)
    const canCreate = currentUser.role === roles.SCLOUDX_ADMIN || currentUser.role === roles.SCLOUDX_USER
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN

    // Local, uncommitted text box value - kept separate from the Redux search
    // term so we can debounce before actually dispatching a fetch.
    const [searchInput, setSearchInput] = React.useState(search)

    React.useEffect(() => {
        if (canCreate) {
            dispatch(getVendors({ limit: 200, page: 1 }))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Re-fetches whenever page, limit, or the committed search term changes.
    React.useEffect(() => {
        dispatch(getSites({ limit: pagination.limit, page: pagination.page + 1, search }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit, search])

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
            label: "Inventory",
            content: (
                <>
                    <TextField
                        fullWidth
                        label="Search inventory"
                        placeholder="Search any site or circuit field - name, address, Vendor Circuit ID, SCloudX Order Reference, etc."
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <InventoryTable pagination={pagination} open={openInventoryTable} handleToggle={handleToggleInventoryTable} details={true} />
                </>
            ),
        },
    ]

    if (canCreate) {
        tabs.push({ label: "Create Circuit", content: <CreateCircuit /> })
    }

    if (isAdmin) {
        tabs.push({
            label: "Deleted Circuits",
            content: (
                <DeletedRecordsPanel
                    columns={deletedCircuitColumns}
                    fetchDeleted={fetchDeletedCircuits}
                    restoreRecord={fetchRestoreCircuit}
                    permanentlyDeleteRecord={fetchPermanentlyDeleteCircuit}
                    entityLabel="circuit"
                />
            ),
        })
        tabs.push({ label: "Bulk Upload", content: <BulkUploadCircuits /> })
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Tabs value={value} onChange={handleChange} aria-label="inventory management">
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

export default function Inventorys() {
    return <InventoryContent />
}
