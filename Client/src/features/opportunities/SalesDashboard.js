import * as React from "react"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
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
import moment from "moment"
import { useDispatch, useSelector } from "react-redux"
import {
    getSalesDashboardSummary,
    selectSalesDashboardSummary,
    selectSalesDashboardSummaryStatus,
    selectSalesDashboardSummaryError,
} from "./opportunitySlice"
import { pageStatusVals } from "./utils"

function formatDate(value) {
    return value ? moment(value).format("MMM D, YYYY") : ""
}

// Smaller than dashboard/Title.js's shared tile title on purpose - this
// dashboard packs in more tiles than the generic one, so both the label and
// the number need to be more compact to keep everything readable at once.
function StatTile({ title, value }) {
    return (
        <Paper sx={{ p: 1, display: "flex", flexDirection: "column", height: 74, justifyContent: "center" }}>
            <Typography component="h2" variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                {title}
            </Typography>
            <Typography component="p" variant="h5" sx={{ fontSize: "1.35rem" }}>{value}</Typography>
        </Paper>
    )
}

StatTile.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

function SectionHeading({ children }) {
    return (
        <Grid item xs={12}>
            <Typography component="h2" variant="h5" sx={{ mt: 1, fontSize: "1rem" }}>{children}</Typography>
        </Grid>
    )
}

SectionHeading.propTypes = {
    children: PropTypes.node.isRequired,
}

function OpenOpportunitiesTable({ rows }) {
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell><Typography variant="subtitle2">Opportunity #</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Name</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Customer / Prospect</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Request Date</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2">Days Pending</Typography></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5}>
                                <Typography variant="body2" color="text.secondary">
                                    No open opportunities
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                    {rows.map((row) => (
                        <TableRow key={row.opportunityId}>
                            <TableCell>{row.opportunityId}</TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>{row.customerOrProspect}</TableCell>
                            <TableCell>{formatDate(row.requestDate)}</TableCell>
                            <TableCell>{row.daysPending ?? ""}</TableCell>
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
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
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

export default function SalesDashboard() {
    const dispatch = useDispatch()
    const summary = useSelector(selectSalesDashboardSummary)
    const status = useSelector(selectSalesDashboardSummaryStatus)
    const error = useSelector(selectSalesDashboardSummaryError)
    const [activeTab, setActiveTab] = React.useState(0)

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
        <Grid container spacing={1.5}>
            <Grid item xs={12}>
                <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)}>
                    <Tab label="Summary" />
                    <Tab label="Opportunities" />
                    <Tab label="Supplier" />
                </Tabs>
            </Grid>

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
    )
}
