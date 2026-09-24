import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import TextField from "@mui/material/TextField"

import OpportunityTable from "./OpportunityTable"
import {
    selectPagination,
    selectSearch as selectOpportunitySearch,
    getOpportunities,
    setSearch as setOpportunitySearch,
    selectAutoExpandOpportunityId,
    setAutoExpandOpportunityId,
} from "./opportunitySlice"
import { useSelector, useDispatch } from "react-redux"
import CreateOpportunity from "./CreateOpportunity"
import BulkUploadOpportunities from "./BulkUploadOpportunities"
import { getCustomers } from "../customers/customerSlice"
import { getVendors } from "../vendors/vendorSlice"
import { fetchDeletedOpportunities, fetchRestoreOpportunity, fetchPermanentlyDeleteOpportunity } from "./opportunityAPI"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import DeletedRecordsPanel from "../../components/DeletedRecordsPanel"

const deletedOpportunityColumns = [
    { id: "name", label: "Opportunity Name" },
    { id: "opportunityId", label: "Opportunity #" },
]

// "Reduce Font of Whole Sales management display" - applied here on the
// page container (same compacting approach as Tickets.js/Inventory.js/
// Sites.js) so it covers every tab: the Opportunity List table, Create
// Opportunity's form, an expanded row's Customer/Supplier Communication
// tabs (OpportunityDetails), Deleted Opportunities and Bulk Upload.
const compactSx = {
    "& .MuiTabs-root": { minHeight: 34 },
    "& .MuiTab-root": { minHeight: 34, py: 0.5, fontSize: "0.75rem" },
    "& .MuiTableCell-root": { fontSize: "0.75rem", padding: "6px 10px" },
    "& .MuiTypography-body1, & .MuiTypography-body2, & .MuiTypography-subtitle1, & .MuiTypography-subtitle2, & .MuiTypography-h6": { fontSize: "0.75rem" },
    "& .MuiTypography-h5": { fontSize: "1rem" },
    "& .MuiInputBase-root, & .MuiInputLabel-root, & .MuiFormControlLabel-label, & .MuiButton-root, & .MuiAlert-root, & .MuiFormHelperText-root": { fontSize: "0.75rem" },
    "& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel": { fontSize: "0.75rem" },
    "& .MuiOutlinedInput-input": { padding: "8px 12px" },
    "& .MuiChip-root": { height: 20 },
    "& .MuiChip-label": { fontSize: "0.68rem" },
    "& .MuiIconButton-root .MuiSvgIcon-root": { fontSize: "1.1rem" },
}

function OpportunitiesContent() {

    const dispatch = useDispatch()
    const pagination = useSelector(selectPagination)
    const opportunitySearch = useSelector(selectOpportunitySearch)
    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN || currentUser.role === roles.SCLOUDX_SALES_ADMIN
    // Permanently deleting an opportunity from the database is SCX-Admin-only
    // (permanentlyDeleteOpportunities is not granted to Sales Admin) -
    // mirrors Users.js's isScxAdmin gating of permanentlyDeleteUsers.
    const isScxAdmin = currentUser.role === roles.SCLOUDX_ADMIN
    // "Add Sales Opportunity Upload facility to Sales User Also" - a
    // narrower right than isAdmin above (Sales User doesn't get Deleted
    // Opportunities, just Bulk Upload - see roles.js's scloudxSalesUser).
    const canBulkUpload = isAdmin || currentUser.role === roles.SCLOUDX_SALES_USER
    // SCX Management's Sales Opportunities access is read-only (no
    // createOpportunities right) - Create Opportunity is left out of the tab
    // list entirely rather than shown and then rejected by the server.
    const isManagement = currentUser.role === roles.SCLOUDX_MANAGEMENT
    const [value, setValue] = React.useState(0)
    // Local, uncommitted text box value - kept separate from the Redux
    // search term so we can debounce before actually dispatching a fetch.
    const [opportunitySearchInput, setOpportunitySearchInput] = React.useState(opportunitySearch)
    // Set by CreateOpportunity right after a successful create, or by
    // SalesDashboard's Opportunity # link (via Redux, since that's a
    // different page - see opportunitySlice.js) - jumps to/back on the list
    // and auto-expands that row so its Opportunity Details/Supplier
    // Communication tabs are immediately visible instead of requiring the
    // user to find it themselves.
    const autoExpandOpportunityId = useSelector(selectAutoExpandOpportunityId)

    const handleOpportunityCreated = (opportunityId) => {
        // A stale search left over from a previous SalesDashboard
        // Opportunity # visit could otherwise hide the opportunity that was
        // just created from the (search-filtered) list it's meant to
        // auto-expand in.
        setOpportunitySearchInput("")
        dispatch(setOpportunitySearch(""))
        setValue(0)
        dispatch(setAutoExpandOpportunityId(opportunityId))
    }

    // "Whenever any tab is pressed, reset all Search selections" - cleared
    // on every tab click (not just a return to Opportunity List), so a
    // SalesDashboard Opportunity # link's seeded search (via Redux - a
    // different page, unlike Inventory's own circuit tabs) never lingers
    // regardless of which tab is clicked next.
    const handleChange = (event, newValue) => {
        setOpportunitySearchInput("")
        dispatch(setOpportunitySearch(""))
        setValue(newValue)
    }

    // Populate the customer dropdown used by CreateOpportunity, and the
    // vendor list used by Supplier Communication's Supplier picker, once on
    // mount.
    React.useEffect(() => {
        dispatch(getCustomers({ limit: 200, page: 1 }))
        dispatch(getVendors({ limit: 200, page: 1 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    React.useEffect(() => {
        dispatch(getOpportunities({
            limit: pagination.limit,
            page: pagination.page + 1,
            search: opportunitySearch,
        }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit, opportunitySearch])

    // Debounce the search box: only commit to Redux (and trigger the fetch
    // above) 400ms after the user stops typing.
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            if (opportunitySearchInput !== opportunitySearch) {
                dispatch(setOpportunitySearch(opportunitySearchInput))
            }
        }, 400)
        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opportunitySearchInput])

    const tabs = [
        {
            label: "Opportunity List",
            content: (
                <>
                    <TextField
                        fullWidth
                        label="Search opportunities"
                        placeholder="Search by name, opportunity #, customer, status, link type, bandwidth, or site address/city/country/PIN"
                        value={opportunitySearchInput}
                        onChange={(event) => setOpportunitySearchInput(event.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <OpportunityTable
                        pagination={pagination}
                        autoExpandOpportunityId={autoExpandOpportunityId}
                        onAutoExpanded={() => dispatch(setAutoExpandOpportunityId(null))}
                    />
                </>
            ),
        },
    ]

    if (!isManagement) {
        tabs.push({ label: "Create Opportunity", content: <CreateOpportunity onCreated={handleOpportunityCreated} /> })
    }

    if (isAdmin) {
        tabs.push({
            label: "Deleted Opportunities",
            content: (
                <DeletedRecordsPanel
                    columns={deletedOpportunityColumns}
                    fetchDeleted={fetchDeletedOpportunities}
                    restoreRecord={fetchRestoreOpportunity}
                    permanentlyDeleteRecord={isScxAdmin ? fetchPermanentlyDeleteOpportunity : null}
                    entityLabel="opportunity"
                />
            ),
        })
    }

    if (canBulkUpload) {
        tabs.push({ label: "Bulk Upload", content: <BulkUploadOpportunities /> })
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, ...compactSx }}>
            <Grid container spacing={3}>

                <Grid item xs={12}>
                    <Tabs value={value} onChange={handleChange} aria-label="sales opportunity management">
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

export default function Opportunities() {
    return <OpportunitiesContent />
}
