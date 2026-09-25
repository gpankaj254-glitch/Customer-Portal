import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"

import InventoryTable from "./InventoryTable"
import CircuitInventoryTable from "./CircuitInventoryTable"
import CreateCircuit from "./CreateCircuit"
import BulkUploadCircuits from "./BulkUploadCircuits"
import { selectPagination, selectSearch, getSites, setSearch, selectTotalCircuits } from "./inventorySlice"
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
    // "Make 'Change Order Number' Clickable and in clicking this it should
    // display Information from Live Circuit Inventory for that Change Order
    // Number" - a Change Order Number is itself the SCX Order Ref Number of
    // the new circuit it refers to, so jumping to the Live Circuit
    // Inventory tab (index 0 - see the tabs array below) with its search
    // seeded to that value finds it via the same search CircuitInventoryTable
    // already does. Local state (not Redux) since both tabs live on this
    // same page, unlike the Ticket ID/Opportunity # links elsewhere, which
    // cross a top-level page switch.
    const [liveCircuitSearchSeed, setLiveCircuitSearchSeed] = React.useState("")
    // "Whenever any hyperlink take to other tab with search option, that
    // search option remain whenever i go to any other tab. Whenever we
    // click on any tab, it should reset ... so search bar is always clear"
    // - CircuitInventoryTable keeps its own search as local state, and
    // React reuses that same component instance across tab switches (same
    // component type/position in the tree), so it never naturally resets on
    // its own. Bumping this key on every direct tab click forces a fresh
    // remount - and a fresh CircuitInventoryTable always starts with an
    // empty search unless handleOpenChangeOrder just seeded one, which
    // doesn't go through handleChange and so doesn't bump this.
    const [circuitTabResetKey, setCircuitTabResetKey] = React.useState(0)

    function handleToggleInventoryTable(){
        setOpenInventoryTable(!openInventoryTable)
    }

    const handleChange = (event, newValue) => {
        setValue(newValue)
        setLiveCircuitSearchSeed("")
        setCircuitTabResetKey((key) => key + 1)
        // "Whenever any tab is pressed, reset all Search selections" - Live/
        // Changed/Ceased Site Inventory all share this one search box/Redux
        // term (searchBox below), so switching straight between them left
        // the old term applied to whichever one was landed on.
        setSearchInput("")
        dispatch(setSearch(""))
    }

    const handleOpenChangeOrder = (changeOrderNumber) => {
        setLiveCircuitSearchSeed(changeOrderNumber)
        setValue(0)
    }

    const pagination = useSelector(selectPagination)
    const search = useSelector(selectSearch)
    const totalCircuits = useSelector(selectTotalCircuits)
    const currentUser = useSelector(selectUser)
    // "Remove Create circuit option from NOC" - SCX Admin only now (SCX
    // Service Delivery doesn't hold createCircuits either; it creates
    // circuits automatically via a completed Delivery Order instead - see
    // deliveryOrder.service.js's createCircuitFromOrder).
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN
    const canCreate = isAdmin
    // "Inventory management - remove Live/Changed/Ceased Site Inventory for
    // everyone except SCX Admin" - supersedes the earlier, narrower "remove
    // for Management and Sales roles only" rule below; the two circuit-
    // centric tabs above them are unaffected either way.
    const hideSiteInventoryTabs = !isAdmin

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
        <>
            {/* "need Total Count of Circuits in Total and based on search
                option" / "Display Circuit Count at Top of the list" -
                narrows along with the search below, since it's driven by
                the same server-side filter (see site.controller.js's
                getSites), not just what's summed from the current page. */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Total Circuits: {totalCircuits}
            </Typography>
            <TextField
                fullWidth
                label="Search inventory"
                placeholder="Search any site or circuit field - name, address, Vendor Circuit ID, SCloudX Order Reference, etc."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                sx={{ mb: 2 }}
            />
        </>
    )

    // "Reorganise Inventory Management tabs in Order - Live Circuit
    // Inventory, Ceased Circuit Inventory, Live Site Inventory, Changed Site
    // Inventory (Rename Changed Inventory), Ceased Site Inventory (Rename
    // Ceased Inventory)" - the two circuit-centric tabs (one row per
    // circuit, across every site - see CircuitInventoryTable.js) now lead,
    // followed by the three site-centric ones (each reusing the same
    // already-fetched siteList, scoped to a different Circuit Status via
    // InventoryTable.js's statusFilter).
    const tabs = [
        {
            label: "Live Circuit Inventory",
            content: (
                <CircuitInventoryTable
                    key={`live-circuit-${circuitTabResetKey}`}
                    statuses={["Live"]}
                    initialSearch={liveCircuitSearchSeed}
                    canDownloadCsv={isAdmin}
                />
            ),
        },
        {
            label: "Ceased Circuit Inventory",
            content: (
                <CircuitInventoryTable
                    key={`ceased-circuit-${circuitTabResetKey}`}
                    statuses={["Changed", "Ceased"]}
                    showChangeType
                    onOpenChangeOrder={handleOpenChangeOrder}
                    canDownloadCsv={isAdmin}
                />
            ),
        },
        ...(hideSiteInventoryTabs ? [] : [
            {
                label: "Live Site Inventory",
                content: (
                    <>
                        {searchBox}
                        <InventoryTable pagination={pagination} open={openInventoryTable} handleToggle={handleToggleInventoryTable} details={true} statusFilter="Live" canDownloadCsv={isAdmin} />
                    </>
                ),
            },
            {
                label: "Changed Site Inventory",
                content: (
                    <>
                        {searchBox}
                        <InventoryTable pagination={pagination} open={openInventoryTable} handleToggle={handleToggleInventoryTable} details={true} statusFilter="Changed" canDownloadCsv={isAdmin} />
                    </>
                ),
            },
            {
                label: "Ceased Site Inventory",
                content: (
                    <>
                        {searchBox}
                        <InventoryTable pagination={pagination} open={openInventoryTable} handleToggle={handleToggleInventoryTable} details={true} statusFilter="Ceased" canDownloadCsv={isAdmin} />
                    </>
                ),
            },
        ]),
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
