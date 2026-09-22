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

// Smaller fonts for everything on the Inventory page (tab row, search box,
// the site list, an expanded site's circuit table, Create, Deleted and Bulk
// Upload). Applied here on the page container rather than in each component,
// same approach as the Tickets page, so the shared ones stay untouched for
// other pages. Menus, dialogs and snackbars render outside this container, so
// they keep their normal size.
const compactSx = {
    "& .MuiTabs-root": { minHeight: 34 },
    "& .MuiTab-root": { minHeight: 34, py: 0.5, fontSize: "0.75rem" },
    "& .MuiTableCell-root": { fontSize: "0.75rem", padding: "6px 10px" },
    "& .MuiTypography-body1, & .MuiTypography-body2, & .MuiTypography-subtitle1, & .MuiTypography-subtitle2, & .MuiTypography-h6, & .MuiTypography-h5": { fontSize: "0.75rem" },
    "& .MuiInputBase-root, & .MuiInputLabel-root, & .MuiFormControlLabel-label, & .MuiButton-root, & .MuiAlert-root, & .MuiFormHelperText-root": { fontSize: "0.75rem" },
    "& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel": { fontSize: "0.75rem" },
    "& .MuiOutlinedInput-input": { padding: "8px 12px" },
    "& .MuiChip-root": { height: 20 },
    "& .MuiChip-label": { fontSize: "0.68rem" },
    "& .MuiIconButton-root .MuiSvgIcon-root": { fontSize: "1.1rem" },
}

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
    // "Remove Create circuit option from NOC" - SCX Admin only now (SCX
    // Service Delivery doesn't hold createCircuits either; it creates
    // circuits automatically via a completed Delivery Order instead - see
    // deliveryOrder.service.js's createCircuitFromOrder).
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN
    const canCreate = isAdmin

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

    const searchBox = (
        <TextField
            fullWidth
            label="Search inventory"
            placeholder="Search any site or circuit field - name, address, Vendor Circuit ID, SCloudX Order Reference, etc."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            sx={{ mb: 2 }}
        />
    )

    // "Change Inventory to Live Inventory, Add 2 more tabs - Changed
    // Inventory / Ceased Inventory" - all three reuse the same already-
    // fetched siteList (see InventoryTable.js's statusFilter), just each
    // scoped to a different Circuit Status.
    const tabs = [
        {
            label: "Live Inventory",
            content: (
                <>
                    {searchBox}
                    <InventoryTable pagination={pagination} open={openInventoryTable} handleToggle={handleToggleInventoryTable} details={true} statusFilter="Live" />
                </>
            ),
        },
        {
            label: "Changed Inventory",
            content: (
                <>
                    {searchBox}
                    <InventoryTable pagination={pagination} open={openInventoryTable} handleToggle={handleToggleInventoryTable} details={true} statusFilter="Changed" />
                </>
            ),
        },
        {
            label: "Ceased Inventory",
            content: (
                <>
                    {searchBox}
                    <InventoryTable pagination={pagination} open={openInventoryTable} handleToggle={handleToggleInventoryTable} details={true} statusFilter="Ceased" />
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
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, ...compactSx }}>
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
