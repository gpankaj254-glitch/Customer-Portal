import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import TextField from "@mui/material/TextField"

import CreateSite from "./CreateSite"
import SiteTable from "./SiteTable"
import BulkUploadSites from "./BulkUploadSites"
import {
    selectPagination,
    selectSearch,
    getSites,
    setSearch,
} from "./siteSlice"
import { fetchDeletedSites, fetchRestoreSite, fetchPermanentlyDeleteSite } from "./siteAPI"
import { useSelector, useDispatch } from "react-redux"
import { getCustomers } from "../customers/customerSlice"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import DeletedRecordsPanel from "../../components/DeletedRecordsPanel"

const deletedSiteColumns = [
    { id: "name", label: "Site Name" },
    { id: "customer.name", label: "Customer" },
    { id: "location.town", label: "Town" },
    { id: "location.country", label: "Country" },
]

// Smaller fonts for everything on the Site Management page (tab row, search
// box, the site list, Create, Deleted and Bulk Upload). Applied here on the
// page container rather than in each component, same approach as the Tickets
// and Inventory pages, so the shared ones stay untouched for other pages.
// Menus, dialogs and snackbars render outside this container, so they keep
// their normal size.
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

function SitesContent() {

    const dispatch = useDispatch()
    const pagination = useSelector(selectPagination)
    const search = useSelector(selectSearch)
    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN
    const canCreate = currentUser.role === roles.SCLOUDX_ADMIN || currentUser.role === roles.SCLOUDX_USER
    const [value, setValue] = React.useState(0)
    // Local, uncommitted text box value - kept separate from the Redux
    // search term so we can debounce before actually dispatching a fetch.
    const [searchInput, setSearchInput] = React.useState(search)

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    // Populate the customer dropdown used by CreateSite once on mount.
    React.useEffect(() => {
        dispatch(getCustomers({ limit: 200, page: 1 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Sites: re-fetches whenever page, limit, or the committed search term
    // changes.
    React.useEffect(() => {
        dispatch(getSites({
            limit: pagination.limit,
            page: pagination.page + 1,
            search,
        }))
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
            label: "Site List",
            content: (
                <>
                    <TextField
                        fullWidth
                        label="Search sites"
                        placeholder="Search by site name, customer, address, town or postal code"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <SiteTable pagination={pagination} />
                </>
            ),
        },
    ]

    if (canCreate) {
        tabs.push({ label: "Create Site", content: <CreateSite /> })
    }

    if (isAdmin) {
        tabs.push({
            label: "Deleted Sites",
            content: (
                <DeletedRecordsPanel
                    columns={deletedSiteColumns}
                    fetchDeleted={fetchDeletedSites}
                    restoreRecord={fetchRestoreSite}
                    permanentlyDeleteRecord={fetchPermanentlyDeleteSite}
                    entityLabel="site"
                />
            ),
        })
        tabs.push({ label: "Bulk Upload", content: <BulkUploadSites /> })
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, ...compactSx }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Tabs value={value} onChange={handleChange} aria-label="site management">
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

export default function Sites() {
    return <SitesContent />
}
