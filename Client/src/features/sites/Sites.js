import * as React from "react"
import Box from "@mui/material/Box"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import DownloadIcon from "@mui/icons-material/Download"
import _ from "lodash"
import moment from "moment"

import CreateSite from "./CreateSite"
import SiteTable from "./SiteTable"
import BulkUploadSites from "./BulkUploadSites"
import {
    selectPagination,
    selectSearch,
    selectSiteList,
    getSites,
    setSearch,
} from "./siteSlice"
import { fetchDeletedSites, fetchRestoreSite, fetchPermanentlyDeleteSite } from "./siteAPI"
import { useSelector, useDispatch } from "react-redux"
import { getCustomers } from "../customers/customerSlice"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import DeletedRecordsPanel from "../../components/DeletedRecordsPanel"
import { downloadCsv } from "../../utils/csv"
import { getFormattedDateTime } from "../../utils/dates"

// "Give CSV Download Option for Site management - Site List Tab ...
// Covering complete information" - every meaningful Site field (location
// broken into its own columns rather than one combined address string, so
// it's usable in a spreadsheet), not just SiteTable's own three display
// columns (Site Name/Customer/Address).
const siteCsvColumns = [
    { id: "code", label: "Site Code" },
    { id: "name", label: "Site Name" },
    { id: "customerName", label: "Customer Name" },
    { id: "customerCode", label: "Customer Code" },
    { id: "region", label: "Region" },
    { id: "endUser", label: "End User" },
    { id: "category", label: "Category" },
    { id: "address", label: "Address" },
    { id: "town", label: "Town" },
    { id: "country", label: "Country" },
    { id: "postalCode", label: "Postal Code" },
    { id: "circuitCount", label: "Circuit Count" },
    { id: "createdAt", label: "Created At" },
    { id: "updatedAt", label: "Updated At" },
]

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
// A comfortable compact size for this long list: 0.8rem = 12.8px for the site
// details AND the column headings (same size, so they line up). It was tried
// smaller (0.7rem / 0.62rem) and was too hard to read. The Deleted Sites tab
// renders inside this container, so it follows.
const compactSx = {
    "& .MuiTabs-root": { minHeight: 34 },
    "& .MuiTab-root": { minHeight: 34, py: 0.5, fontSize: "0.75rem" },
    "& .MuiTableCell-root": { fontSize: "0.8rem", padding: "4px 10px" },
    "& .MuiTypography-body1, & .MuiTypography-body2, & .MuiTypography-subtitle1, & .MuiTypography-subtitle2, & .MuiTypography-h5": { fontSize: "0.8rem" },
    // Column headings: the app-wide heading style is all-small-caps, which draws
    // lowercase letters smaller than the row text even at the same font size -
    // switch it off here so headings and site details match visually.
    "& .MuiTypography-h6": { fontSize: "0.8rem", fontVariantCaps: "normal", letterSpacing: "0.01em" },
    "& .MuiInputBase-root, & .MuiInputLabel-root, & .MuiFormControlLabel-label, & .MuiButton-root, & .MuiAlert-root, & .MuiFormHelperText-root": { fontSize: "0.8rem" },
    "& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel": { fontSize: "0.8rem" },
    "& .MuiOutlinedInput-input": { padding: "8px 12px" },
    "& .MuiChip-root": { height: 20 },
    "& .MuiChip-label": { fontSize: "0.7rem" },
    "& .MuiIconButton-root .MuiSvgIcon-root": { fontSize: "1.1rem" },
    // The row's tick-box and edit/delete buttons carry most of an SCX row's
    // height (51px vs 25px for a customer, who has none of them) - trim their
    // padding so the rows sit close together.
    "& .MuiCheckbox-root": { padding: "2px" },
    "& .MuiCheckbox-root .MuiSvgIcon-root": { fontSize: "1rem" },
    "& .MuiTableCell-root .MuiIconButton-root": { padding: "2px" },
}

function SitesContent() {

    const dispatch = useDispatch()
    const pagination = useSelector(selectPagination)
    const search = useSelector(selectSearch)
    const siteList = useSelector(selectSiteList)
    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN
    // SCX NOC no longer creates sites here. SCX Admin and SCX Service
    // Delivery both hold createSites (see roles.js) - Service Delivery gets
    // the tab here too, on top of the inline "Create Site" it already has
    // while completing a Delivery Order (see OrderDetails.js).
    const canCreate = isAdmin || currentUser.role === roles.SCLOUDX_SERVICE_DELIVERY
    const [value, setValue] = React.useState(0)
    // Local, uncommitted text box value - kept separate from the Redux
    // search term so we can debounce before actually dispatching a fetch.
    const [searchInput, setSearchInput] = React.useState(search)

    // "Whenever any tab is pressed, reset all Search selections" - cleared
    // on every tab click so a stale search never carries over on return.
    const handleChange = (event, newValue) => {
        setSearchInput("")
        dispatch(setSearch(""))
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

    // "Give CSV Download options for Inventory, and Site list only to SCX
    // Admin User" - siteList already holds every site matching the current
    // search (pagination.limit is 1000, effectively "no limit" - see
    // siteSlice.js), so this exports exactly what's on screen without a
    // separate fetch.
    const handleDownloadSitesCsv = () => {
        const headers = siteCsvColumns.map((column) => column.label)
        const rows = siteList.map((site) => {
            const row = {
                code: site.code || "",
                name: site.name || "",
                customerName: _.get(site, "customer.name", ""),
                customerCode: _.get(site, "customer.code", ""),
                region: _.get(site, "region.name", ""),
                endUser: site.customerSiteIdentifier || "",
                category: site.category || "",
                address: _.get(site, "location.address", ""),
                town: _.get(site, "location.town", ""),
                country: _.get(site, "location.country", ""),
                postalCode: _.get(site, "location.postalCode", ""),
                circuitCount: _.get(site, "circuitCount", ""),
                createdAt: getFormattedDateTime(site.createdAt),
                updatedAt: getFormattedDateTime(site.updatedAt),
            }
            return siteCsvColumns.map((column) => row[column.id])
        })
        downloadCsv(`sites-${moment().format("YYYY-MM-DD")}.csv`, headers, rows)
    }

    const tabs = [
        {
            label: "Site List",
            content: (
                <>
                    {/* "All Logins - ... Site List ... Display count at top" */}
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        Total Sites: {pagination.totalResults}
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Search sites"
                            placeholder="Search by site name, customer, address, town or postal code"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            sx={{ mb: 2 }}
                        />
                        {isAdmin && (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownloadSitesCsv}
                                disabled={siteList.length === 0}
                                sx={{ flexShrink: 0, mt: 0.5 }}
                            >
                                Download CSV
                            </Button>
                        )}
                    </Box>
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
