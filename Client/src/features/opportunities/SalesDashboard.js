import * as React from "react"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import Link from "@mui/material/Link"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import Alert from "@mui/material/Alert"
import PropTypes from "prop-types"
import _ from "lodash"
import { useDispatch, useSelector } from "react-redux"
import {
    getSalesDashboardSummary,
    selectSalesDashboardSummary,
    selectSalesDashboardSummaryStatus,
    selectSalesDashboardSummaryError,
    setAutoExpandOpportunityId,
    setSearch as setOpportunitySearch,
} from "./opportunitySlice"
import { togglePage } from "../landing/landingSlice"
import { pages } from "../../consts"
import { pageStatusVals } from "./utils"
import { getFormattedDateOnly as formatDate } from "../../utils/dates"

// Set by SalesDashboard's `compact` prop (used when it's embedded in the SCX
// Admin dashboard, next to the ticket tabs) so the tiles, headings and tables
// match that dashboard's smaller fonts.
const CompactContext = React.createContext(false)

const compactTableSx = {
    "& .MuiTableCell-root": { fontSize: "0.72rem", padding: "4px 8px" },
    "& .MuiTypography-root": { fontSize: "0.72rem" },
}

// Smaller than dashboard/Title.js's shared tile title on purpose - this
// dashboard packs in more tiles than the generic one, so both the label and
// the number need to be more compact to keep everything readable at once.
function StatTile({ title, value }) {
    const compact = React.useContext(CompactContext)
    return (
        <Paper sx={{ p: 1, display: "flex", flexDirection: "column", height: compact ? 62 : 74, justifyContent: "center" }}>
            <Typography component="h2" variant="caption" color="primary" sx={{ fontWeight: 600, fontSize: compact ? "0.7rem" : undefined }}>
                {title}
            </Typography>
            <Typography component="p" variant="h5" sx={{ fontSize: compact ? "1.1rem" : "1.35rem" }}>{value}</Typography>
        </Paper>
    )
}

StatTile.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

function SectionHeading({ children }) {
    const compact = React.useContext(CompactContext)
    return (
        <Grid item xs={12}>
            <Typography
                component="h2"
                variant="h5"
                sx={compact ? { mt: 0.5, fontSize: "0.85rem", fontWeight: 600 } : { mt: 1, fontSize: "1rem" }}
            >
                {children}
            </Typography>
        </Grid>
    )
}

SectionHeading.propTypes = {
    children: PropTypes.node.isRequired,
}

// Same combined column as the Sales Opportunity List's own "Site Address /
// City / Country" - see OpportunityTable.js's displaySiteLocation.
function displaySiteLocation(row) {
    return [row.siteAddress, row.city, row.country].filter(Boolean).join(", ")
}

// "In Sales Dashboard - Opportunities, List Columns - ... Also make
// Opportunity # hyperlinked to Actual opportunity in Sales Management" -
// same column set as the Sales Opportunity List itself (minus its Actions
// column, this table is view-only), and Opportunity # jumps to Sales
// Management with that row auto-expanded - setAutoExpandOpportunityId is
// the same mechanism CreateOpportunity already uses locally, just reachable
// across the page switch via Redux (see opportunitySlice.js).
// "In NOC, Open Ticket click, it searches that Ticket ID and Opens that
// only. but in Sales Opportunity, it displays the list also along with that
// particular ID" - mirrors ticketSlice's own focusTicket exactly (it sets
// `search` to the ticket ID, not just an expand target), which is what
// actually narrows Tickets down to the one row rather than just scrolling
// to it in the full list - so this also sets the Opportunity List's own
// search to this row's Opportunity # alongside the auto-expand id.
function OpenOpportunitiesTable({ rows }) {
    const compact = React.useContext(CompactContext)
    const dispatch = useDispatch()

    const handleOpenOpportunity = (row) => {
        dispatch(setOpportunitySearch(row.opportunityId))
        dispatch(setAutoExpandOpportunityId(row.id))
        dispatch(togglePage(pages.SALES_OPPORTUNITIES))
    }

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={compact ? compactTableSx : undefined}>
                <TableHead>
                    <TableRow>
                        <TableCell><Typography variant="subtitle2">Opportunity #</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Name</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Customer / Prospect</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Request Date</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Quote Status</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Link Type</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Download BW</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Site Address / City / Country</Typography></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={8}>
                                <Typography variant="body2" color="text.secondary">
                                    No open opportunities
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                    {rows.map((row) => (
                        <TableRow key={row.opportunityId}>
                            <TableCell>
                                {row.id ? (
                                    <Link component="button" variant="body2" onClick={() => handleOpenOpportunity(row)}>
                                        {row.opportunityId}
                                    </Link>
                                ) : row.opportunityId}
                            </TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>{row.customerOrProspect}</TableCell>
                            <TableCell>{formatDate(row.requestDate)}</TableCell>
                            <TableCell>{row.quoteStatus}</TableCell>
                            <TableCell>{row.linkType}</TableCell>
                            <TableCell>{row.downBandwidth}</TableCell>
                            <TableCell>{displaySiteLocation(row)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

OpenOpportunitiesTable.propTypes = {
    rows: PropTypes.array.isRequired,
}

function SupplierWiseReportTable({ rows }) {
    const compact = React.useContext(CompactContext)
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={compact ? compactTableSx : undefined}>
                <TableHead>
                    <TableRow>
                        <TableCell><Typography variant="subtitle2">Supplier</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Quotes Pending</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Pending &gt; 3 Days</Typography></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3}>
                                <Typography variant="body2" color="text.secondary">
                                    No pending supplier quotes
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                    {rows.map((row) => (
                        <TableRow key={row.supplier}>
                            <TableCell>{row.supplier}</TableCell>
                            <TableCell>{row.pending}</TableCell>
                            <TableCell>{row.pendingOverThreeDays}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

SupplierWiseReportTable.propTypes = {
    rows: PropTypes.array.isRequired,
}

// embeddedTab: when the host page renders the tab row itself (the SCX Admin
// dashboard, which lists these tabs after its ticket tabs), pass the index of
// the tab to show (0 Summary, 1 Opportunities, 2 Supplier) and this renders
// just that tab's content, with no tab row of its own.
export default function SalesDashboard({ embeddedTab, compact }) {
    const dispatch = useDispatch()
    const summary = useSelector(selectSalesDashboardSummary)
    const status = useSelector(selectSalesDashboardSummaryStatus)
    const error = useSelector(selectSalesDashboardSummaryError)
    const [ownTab, setOwnTab] = React.useState(0)
    const embedded = embeddedTab !== undefined
    const activeTab = embedded ? embeddedTab : ownTab

    React.useEffect(() => {
        dispatch(getSalesDashboardSummary())
    }, [dispatch])

    if (error) {
        return <Alert severity="error">Unable to load sales dashboard</Alert>
    }
    if (status !== pageStatusVals.fetched || !summary) {
        return <Typography variant="body2">Loading...</Typography>
    }

    const supplierWiseReport = _.get(summary, "supplierWiseReport", [])
    const openOpportunities = _.get(summary, "openOpportunities", [])

    return (
        <CompactContext.Provider value={!!compact}>
        <Grid container spacing={1.5}>
            {!embedded && (
                <Grid item xs={12}>
                    <Tabs
                        value={activeTab}
                        onChange={(event, newValue) => setOwnTab(newValue)}
                        sx={compact ? { minHeight: 34, "& .MuiTab-root": { minHeight: 34, py: 0.5, fontSize: "0.75rem" } } : undefined}
                    >
                        <Tab label="Summary" />
                        <Tab label="Opportunities" />
                        <Tab label="Supplier" />
                    </Tabs>
                </Grid>
            )}

            {activeTab === 0 && (
                <>
                    <Grid item xs={12} sm={6}>
                        <StatTile title="Total Open Opportunities" value={_.get(summary, "totalOpenOpportunities", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <StatTile title="Open Opportunities Pending > 3 Days" value={_.get(summary, "openOpportunitiesOverThreeDays", 0)} />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <StatTile title="Supplier Quotes Pending" value={_.get(summary, "supplierQuotesPending", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <StatTile title="Supplier Quotes Pending > 3 Days" value={_.get(summary, "supplierQuotesPendingOverThreeDays", 0)} />
                    </Grid>

                    <SectionHeading>Last 30 Days (Opportunity)</SectionHeading>
                    <Grid item xs={12} sm={4}>
                        <StatTile title="Customer Quotes Submitted" value={_.get(summary, "customerLast30Days.quotesSubmitted", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <StatTile title="Customer Quotes Won" value={_.get(summary, "customerLast30Days.quotesWon", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <StatTile title="Customer Quotes Awaiting Feedback" value={_.get(summary, "customerLast30Days.quotesAwaitingFeedback", 0)} />
                    </Grid>

                    <SectionHeading>Last 30 Days (Supplier)</SectionHeading>
                    <Grid item xs={12} sm={6}>
                        <StatTile title="Supplier Quotes Submitted" value={_.get(summary, "supplierLast30Days.quotesSubmitted", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <StatTile title="Supplier Quotes Received" value={_.get(summary, "supplierLast30Days.quotesReceived", 0)} />
                    </Grid>
                </>
            )}

            {activeTab === 1 && (
                <>
                    <Grid item xs={12} sm={6} md={4}>
                        <StatTile title="Total Open Opportunities" value={_.get(summary, "totalOpenOpportunities", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <StatTile title="Open Opportunities Pending > 3 Days" value={_.get(summary, "openOpportunitiesOverThreeDays", 0)} />
                    </Grid>

                    <SectionHeading>Last 30 Days (Opportunity)</SectionHeading>
                    <Grid item xs={12} sm={4}>
                        <StatTile title="Customer Quotes Submitted" value={_.get(summary, "customerLast30Days.quotesSubmitted", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <StatTile title="Customer Quotes Won" value={_.get(summary, "customerLast30Days.quotesWon", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <StatTile title="Customer Quotes Awaiting Feedback" value={_.get(summary, "customerLast30Days.quotesAwaitingFeedback", 0)} />
                    </Grid>

                    <SectionHeading>Open Opportunities</SectionHeading>
                    <Grid item xs={12}>
                        <OpenOpportunitiesTable rows={openOpportunities} />
                    </Grid>
                </>
            )}

            {activeTab === 2 && (
                <>
                    <Grid item xs={12} sm={6}>
                        <StatTile title="Supplier Quotes Pending" value={_.get(summary, "supplierQuotesPending", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <StatTile title="Supplier Quotes Pending > 3 Days" value={_.get(summary, "supplierQuotesPendingOverThreeDays", 0)} />
                    </Grid>

                    <SectionHeading>Last 30 Days (Supplier)</SectionHeading>
                    <Grid item xs={12} sm={6}>
                        <StatTile title="Supplier Quotes Submitted" value={_.get(summary, "supplierLast30Days.quotesSubmitted", 0)} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <StatTile title="Supplier Quotes Received" value={_.get(summary, "supplierLast30Days.quotesReceived", 0)} />
                    </Grid>

                    <SectionHeading>Supplier-wise Report</SectionHeading>
                    <Grid item xs={12}>
                        <SupplierWiseReportTable rows={supplierWiseReport} />
                    </Grid>
                </>
            )}
        </Grid>
        </CompactContext.Provider>
    )
}

SalesDashboard.propTypes = {
    embeddedTab: PropTypes.number,
    compact: PropTypes.bool,
}
