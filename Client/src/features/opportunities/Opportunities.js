import * as React from "react"
import Box from "@mui/material/Box"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import DownloadIcon from "@mui/icons-material/Download"
import _ from "lodash"
import moment from "moment"

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
import { fetchDeletedOpportunities, fetchRestoreOpportunity, fetchPermanentlyDeleteOpportunity, fetchGetOpportunities } from "./opportunityAPI"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import DeletedRecordsPanel from "../../components/DeletedRecordsPanel"
import { downloadCsv } from "../../utils/csv"
import { getFormattedDateTime } from "../../utils/dates"

const deletedOpportunityColumns = [
    { id: "name", label: "Opportunity Name" },
    { id: "opportunityId", label: "Opportunity #" },
]

// "Give CSV Download Option for ... Sales management - Opportunity List Tab
// Covering complete information" - every meaningful Opportunity field
// (Customer Request detail, latest Quote, and a Supplier Communications
// summary), not just OpportunityTable's own list columns.
const opportunityCsvColumns = [
    { id: "opportunityId", label: "Opportunity #" },
    { id: "name", label: "Name" },
    { id: "customerOrProspect", label: "Customer / Prospect" },
    { id: "stage", label: "Stage" },
    { id: "value", label: "Value" },
    { id: "expectedCloseDate", label: "Expected Close Date" },
    { id: "owner", label: "Owner" },
    { id: "description", label: "Description" },
    { id: "requestDate", label: "Request Date" },
    { id: "linkType", label: "Link Type" },
    { id: "siteAddress", label: "Site Address" },
    { id: "city", label: "City" },
    { id: "state", label: "State" },
    { id: "country", label: "Country" },
    { id: "zipCode", label: "Zip Code" },
    { id: "product", label: "Product" },
    { id: "ipRequirement", label: "IP Requirement" },
    { id: "interface", label: "Interface" },
    { id: "downBandwidth", label: "Download BW" },
    { id: "upBandwidth", label: "Upload BW" },
    { id: "contractTerm", label: "Contract Term" },
    { id: "quoteSubmitDate", label: "Quote Submit Date" },
    { id: "quoteStatus", label: "Quote Status" },
    { id: "currency", label: "Currency" },
    { id: "nrc", label: "NRC" },
    { id: "mrc", label: "MRC" },
    { id: "supplierCommunications", label: "Supplier Communications" },
    { id: "convertedOrderNumber", label: "Converted Order Number" },
    { id: "convertedOrderValue", label: "Converted Order Value" },
    { id: "convertedAt", label: "Converted At" },
    { id: "createdAt", label: "Created At" },
    { id: "updatedAt", label: "Updated At" },
]

function buildOpportunityCsvRow(opportunity) {
    const row = {
        opportunityId: opportunity.opportunityId || "",
        name: opportunity.name || "",
        customerOrProspect: _.get(opportunity, "customer.name") || opportunity.prospectName || "",
        stage: opportunity.stage || "",
        value: opportunity.value ?? "",
        expectedCloseDate: opportunity.expectedCloseDate || "",
        owner: _.get(opportunity, "owner.name", ""),
        description: opportunity.description || "",
        requestDate: _.get(opportunity, "customerRequest.requestDate", ""),
        linkType: _.get(opportunity, "customerRequest.linkType", ""),
        siteAddress: _.get(opportunity, "customerRequest.siteAddress", ""),
        city: _.get(opportunity, "customerRequest.city", ""),
        state: _.get(opportunity, "customerRequest.state", ""),
        country: _.get(opportunity, "customerRequest.country", ""),
        zipCode: _.get(opportunity, "customerRequest.zipCode", ""),
        product: _.get(opportunity, "customerRequest.product", ""),
        ipRequirement: _.get(opportunity, "customerRequest.ipRequirement", ""),
        interface: _.get(opportunity, "customerRequest.interface", ""),
        downBandwidth: _.get(opportunity, "customerRequest.downBandwidth", ""),
        upBandwidth: _.get(opportunity, "customerRequest.upBandwidth", ""),
        contractTerm: _.get(opportunity, "customerRequest.contractTerm", ""),
        quoteSubmitDate: _.get(opportunity, "customerRequest.quoteSubmitDate", ""),
        quoteStatus: _.get(opportunity, "customerRequest.quoteStatus", ""),
        currency: _.get(opportunity, "customerRequest.currency", ""),
        nrc: _.get(opportunity, "customerRequest.nrc") ?? "",
        mrc: _.get(opportunity, "customerRequest.mrc") ?? "",
        // One CSV cell per opportunity, not one row per supplier - each
        // entry summarized with every Supplier Communication field worth
        // having (LEC, Currency, NRC/MRC, Bandwidth, both dates, Remarks -
        // blank ones dropped rather than shown as empty), several suppliers
        // semicolon-joined, so the whole repeatable list still fits this
        // flat, one-row-per-opportunity export.
        supplierCommunications: (opportunity.supplierCommunications || [])
            .map((communication) => {
                const parts = [communication.supplier, communication.quoteStatus].filter(Boolean)
                const fields = [
                    ["LEC", communication.lec],
                    ["Currency", communication.currency],
                    ["NRC", communication.nrc !== null && communication.nrc !== undefined ? communication.nrc : ""],
                    ["MRC", communication.mrc !== null && communication.mrc !== undefined ? communication.mrc : ""],
                    ["BW", communication.bandwidth],
                    ["Quote Request Date", communication.quoteRequestDate],
                    ["Quote Submit Date", communication.quoteSubmitDate],
                    ["Remarks", communication.remarks],
                ]
                    .filter(([, fieldValue]) => fieldValue !== "" && fieldValue !== null && fieldValue !== undefined)
                    .map(([fieldLabel, fieldValue]) => `${fieldLabel}: ${fieldValue}`)
                return [parts.join(" - "), ...fields].filter(Boolean).join(" | ")
            })
            .filter(Boolean)
            .join("; "),
        convertedOrderNumber: _.get(opportunity, "convertedOrder.orderNumber", ""),
        convertedOrderValue: _.get(opportunity, "convertedOrder.orderValue") ?? "",
        convertedAt: getFormattedDateTime(_.get(opportunity, "convertedOrder.convertedAt")),
        createdAt: getFormattedDateTime(opportunity.createdAt),
        updatedAt: getFormattedDateTime(opportunity.updatedAt),
    }
    return opportunityCsvColumns.map((column) => row[column.id])
}

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
    // "Sales Management CSV to SCX Admin, SCX Sales Admin and Management
    // users" - isAdmin above already covers Admin + Sales Admin.
    const canDownloadCsv = isAdmin || isManagement
    const [value, setValue] = React.useState(0)
    const [downloadingCsv, setDownloadingCsv] = React.useState(false)
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

    // "Give CSV Download Option for ... Sales management - Opportunity List
    // Tab Covering complete information" - opportunityList in Redux only
    // ever holds the current on-screen page (pagination.limit defaults to
    // 20, unlike Inventory/Sites' effectively-unlimited fetches), so
    // "complete information" needs its own fetch of every opportunity
    // matching the current search, independent of what's currently
    // displayed - same direct-fetch-outside-Redux pattern DeletedRecordsPanel
    // uses (fetchGetOpportunities's own rejectWithValue just returns the
    // plain error string here rather than a real action wrapper).
    const handleDownloadCsv = async () => {
        setDownloadingCsv(true)
        try {
            const result = await fetchGetOpportunities(
                { limit: 5000, page: 1, search: opportunitySearch },
                (payload) => payload
            )
            const rows = (result && result.results ? result.results : []).map(buildOpportunityCsvRow)
            downloadCsv(
                `sales-opportunities-${moment().format("YYYY-MM-DD")}.csv`,
                opportunityCsvColumns.map((column) => column.label),
                rows
            )
        } finally {
            setDownloadingCsv(false)
        }
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
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Search opportunities"
                            placeholder="Search by name, opportunity #, customer, request date, status, link type, bandwidth, or site address/city/country/PIN"
                            value={opportunitySearchInput}
                            onChange={(event) => setOpportunitySearchInput(event.target.value)}
                            sx={{ mb: 2 }}
                        />
                        {canDownloadCsv && (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownloadCsv}
                                disabled={downloadingCsv}
                                sx={{ flexShrink: 0, mt: 0.5, whiteSpace: "nowrap" }}
                            >
                                {downloadingCsv ? "Preparing..." : "Download CSV"}
                            </Button>
                        )}
                    </Box>
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
