import * as React from "react"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import Autocomplete from "@mui/material/Autocomplete"
import FormControlLabel from "@mui/material/FormControlLabel"
import Checkbox from "@mui/material/Checkbox"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
import Select from "@mui/material/Select"
import MenuItem from "@mui/material/MenuItem"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import Link from "@mui/material/Link"
import Alert from "@mui/material/Alert"
import Button from "@mui/material/Button"
import DownloadIcon from "@mui/icons-material/Download"
import _ from "lodash"
import moment from "moment"
import { useDispatch, useSelector } from "react-redux"
import { getCircuitsList, selectCircuitsList, selectCircuitsListStatus, selectCircuitsListError } from "../inventory/circuitSlice"
import { getVendors, selectVendorList } from "../vendors/vendorSlice"
import { focusSite } from "../inventory/inventorySlice"
import { pageStatusVals } from "../inventory/utils"
import { togglePage } from "../landing/landingSlice"
import { pages } from "../../consts"
import { downloadCsv } from "../../utils/csv"

// Fixed column widths (see the Table's tableLayout: "fixed" below) so every
// row lines up under its header instead of each column auto-sizing to its
// own widest value.
const columns = [
    { id: "siteName", label: "Site Name", width: "10%" },
    { id: "customerName", label: "Customer Name", width: "10%" },
    { id: "vendorName", label: "Vendor Name", width: "9%" },
    // "Remove Vendor Circuit ID and Replace with SCX Order Ref Number" -
    // same slot, see circuit.controller.js's getCircuits for the matching
    // search-field swap.
    { id: "scloudxOrderReference", label: "SCX Order Ref Number", width: "9%" },
    { id: "customerCircuitBillStartDate", label: "Customer Bill Start Date", width: "10%" },
    { id: "vendorCircuitBillStartDate", label: "Vendor Bill Start Date", width: "10%" },
    { id: "customerCircuitContractTerm", label: "Customer Contract Term", width: "9%" },
    { id: "vendorCircuitContractTerm", label: "Vendor Contract Term", width: "9%" },
    { id: "customerContractPendingMonths", label: "Customer Contract Pending (Months)", width: "8%" },
    { id: "vendorContractPendingMonths", label: "Vendor Contract Pending (Months)", width: "8%" },
    // "Where there is gap between Vendor Contract pending month / Customer
    // contract pending month (Vendor Contract pending month - Customer
    // contract pending month)" - see computeContractPendingMonths/rows below.
    { id: "contractGapMonths", label: "Contract Gap (Months)", width: "8%" },
]

// Bill Start Date is stored "DD-MM-YYYY" (see circuit.service.js's
// BULK_DATE_FORMAT). Contract Term is mostly "NN Months" but isn't
// consistently structured real data (blank, "Coterm", "36-Months", "36
// mths", etc. all show up) - only the leading digit run is used, so
// anything with no digits at all can't be computed.
const CONTRACT_TERM_MONTHS = /(\d+)/

// "Customer/Vendor Contract Pending (Months)" = (Bill Start Date + Contract
// Term) - Today() - how many whole months are left before that side's
// contract term ends. Negative once it's already expired. Shared by both
// the Customer and Vendor columns (see the rows mapping below), just fed
// each side's own Bill Start Date/Contract Term. Returns null when either
// input can't be parsed (blank/invalid date, non-numeric term like
// "Coterm").
function computeContractPendingMonths(billStartDate, contractTerm) {
    const start = moment(billStartDate, "DD-MM-YYYY", true)
    const monthsMatch = CONTRACT_TERM_MONTHS.exec(contractTerm || "")
    if (!start.isValid() || !monthsMatch) {
        return null
    }
    const endDate = start.clone().add(Number(monthsMatch[1]), "months")
    return endDate.diff(moment(), "months")
}

// SCX Finance's dashboard: a read-only, cross-customer circuit list with
// billing-relevant columns only (no ticket/status/inventory-management
// fields), and a search box. The server does the searching (site/customer/
// vendor name, SCX Order Ref Number, bill start dates, contract terms - see
// circuit.controller's getCircuits) - this component only resolves each
// circuit's vendorId into the Vendor Name column, same as the Inventory
// page's circuit table does.
export default function FinanceDashboard() {
    const dispatch = useDispatch()
    const circuits = useSelector(selectCircuitsList)
    const status = useSelector(selectCircuitsListStatus)
    const error = useSelector(selectCircuitsListError)
    const vendorList = useSelector(selectVendorList)

    const [searchInput, setSearchInput] = React.useState("")
    const [search, setSearch] = React.useState("")
    // "1. Filter by Customer or Vendor, 2. Basis that then Select Customer
    // or Vendor Name, 3. then filter to select their contract term pending
    // > or < # months" - a guided, sequential filter, entirely client-side
    // (same rows the search box already filters via the server).
    // filterBasis picks which side's Name list/Contract Pending field steps
    // 2-3 apply to; "" (None) leaves the table unfiltered by any of this.
    const [filterBasis, setFilterBasis] = React.useState("")
    const [filterName, setFilterName] = React.useState(null)
    const [pendingOperator, setPendingOperator] = React.useState(">")
    const [pendingThreshold, setPendingThreshold] = React.useState("")
    // "Where there is gap between Vendor Contract pending month / Customer
    // contract pending month" - shows only rows where both sides could be
    // computed and they don't match. Independent of, and combinable with,
    // the filter above.
    const [onlyGapRows, setOnlyGapRows] = React.useState(false)
    // "Sorting the List in Ascending or Descending order by Contract
    // Pending (Months) for both customer and supplier" - sortField is
    // either Contract Pending column's id ("" = unsorted, keeps the
    // server's own site.name order).
    const [sortField, setSortField] = React.useState("")
    const [sortDirection, setSortDirection] = React.useState("asc")

    // Switching basis invalidates the previously-picked Name (a Vendor name
    // isn't a valid Customer name and vice versa).
    const handleFilterBasisChange = (event) => {
        setFilterBasis(event.target.value)
        setFilterName(null)
    }

    React.useEffect(() => {
        dispatch(getVendors({ limit: 1000, page: 1 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    React.useEffect(() => {
        dispatch(getCircuitsList({ search }))
    }, [dispatch, search])

    // Debounce the search box: only commit (and trigger the fetch above)
    // 400ms after the user stops typing - same as the Inventory search.
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchInput !== search) {
                setSearch(searchInput)
            }
        }, 400)
        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput])

    const vendorNameById = React.useMemo(
        () => new Map(vendorList.map((vendor) => [vendor.id, vendor.name])),
        [vendorList]
    )

    // Sends the user to Inventory Management with this circuit's site
    // expanded - same pattern as the Dashboard's Ticket ID link (focusTicket).
    const handleOpenSite = (siteId, siteName) => {
        dispatch(focusSite({ id: siteId, name: siteName }))
        dispatch(togglePage(pages.INVENTORY))
    }

    const rows = circuits.map((circuit) => {
        const customerPendingMonths = computeContractPendingMonths(circuit.customerCircuitBillStartDate, circuit.customerCircuitContractTerm)
        const vendorPendingMonths = computeContractPendingMonths(circuit.vendorCircuitBillStartDate, circuit.vendorCircuitContractTerm)
        return {
            id: circuit.id,
            siteId: _.get(circuit, "site.id", ""),
            siteName: _.get(circuit, "site.name", ""),
            customerName: _.get(circuit, "customer.name", ""),
            vendorName: vendorNameById.get(circuit.vendorId) || "",
            scloudxOrderReference: circuit.scloudxOrderReference || "",
            customerCircuitBillStartDate: circuit.customerCircuitBillStartDate || "",
            vendorCircuitBillStartDate: circuit.vendorCircuitBillStartDate || "",
            customerCircuitContractTerm: circuit.customerCircuitContractTerm || "",
            vendorCircuitContractTerm: circuit.vendorCircuitContractTerm || "",
            customerContractPendingMonths: customerPendingMonths === null ? "-" : String(customerPendingMonths),
            vendorContractPendingMonths: vendorPendingMonths === null ? "-" : String(vendorPendingMonths),
            // "Vendor Contract pending month - Customer contract pending
            // month" - "-" (not computable) whenever either side is, so it
            // never reads as a real, misleading zero.
            contractGapMonths: customerPendingMonths === null || vendorPendingMonths === null
                ? "-"
                : String(vendorPendingMonths - customerPendingMonths),
        }
    })

    // Name dropdown options for step 2 - every distinct name actually
    // present in the (search-filtered) list, not the full Vendor/Customer
    // Management lists, so there's never an option that would just empty
    // the table out. Only the one matching the current basis is ever shown.
    const filterNameOptions = React.useMemo(() => {
        if (filterBasis === "vendor") {
            return _.uniq(rows.map((row) => row.vendorName).filter(Boolean)).sort()
        }
        if (filterBasis === "customer") {
            return _.uniq(rows.map((row) => row.customerName).filter(Boolean)).sort()
        }
        return []
    }, [rows, filterBasis])

    // Step 3 - "their contract term pending > or < # months", applied to
    // whichever side's own Contract Pending field matches the chosen basis.
    // A row that isn't computable ("-") never matches a threshold - there's
    // nothing to compare.
    function matchesPendingThreshold(pendingValue) {
        if (pendingThreshold === "") return true
        if (pendingValue === "-") return false
        const numeric = Number(pendingValue)
        const threshold = Number(pendingThreshold)
        return pendingOperator === ">" ? numeric > threshold : numeric < threshold
    }

    const filteredRows = rows.filter((row) => {
        if (filterBasis === "customer") {
            if (filterName && row.customerName !== filterName) return false
            if (!matchesPendingThreshold(row.customerContractPendingMonths)) return false
        } else if (filterBasis === "vendor") {
            if (filterName && row.vendorName !== filterName) return false
            if (!matchesPendingThreshold(row.vendorContractPendingMonths)) return false
        }
        if (onlyGapRows && (row.contractGapMonths === "-" || Number(row.contractGapMonths) === 0)) return false
        return true
    })

    // Rows that couldn't be computed ("-") always sort last regardless of
    // direction - there's no real value to place them by, and burying them
    // at the top (as the smallest possible value would, ascending) would
    // read as "most urgent" when they're actually just unknown.
    const sortedRows = sortField
        ? [...filteredRows].sort((a, b) => {
            const left = a[sortField]
            const right = b[sortField]
            if (left === "-" && right === "-") return 0
            if (left === "-") return 1
            if (right === "-") return -1
            const diff = Number(left) - Number(right)
            return sortDirection === "asc" ? diff : -diff
        })
        : filteredRows

    // "Download this whole list in CSV file" - exports exactly what's
    // currently on screen (search + filters + sort applied), not the
    // unfiltered full fetch, matching what "this list" refers to.
    const handleDownloadCsv = () => {
        const headers = columns.map((column) => column.label)
        const csvRows = sortedRows.map((row) => columns.map((column) => row[column.id]))
        downloadCsv(`finance-circuits-${moment().format("YYYY-MM-DD")}.csv`, headers, csvRows)
    }

    const loading = status === pageStatusVals.loading || status === pageStatusVals.idle

    return (
        <Grid container spacing={1.5}>
            <Grid item xs={12}>
                <TextField
                    fullWidth
                    size="small"
                    label="Search circuits"
                    placeholder="Search by site, customer, vendor, SCX Order Ref Number, bill start date or contract term"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                />
            </Grid>
            {/* 1. Filter by Customer or Vendor */}
            <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                    <InputLabel id="finance-filter-basis-label">Filter by</InputLabel>
                    <Select
                        labelId="finance-filter-basis-label"
                        label="Filter by"
                        value={filterBasis}
                        onChange={handleFilterBasisChange}
                    >
                        <MenuItem value=""><em>None</em></MenuItem>
                        <MenuItem value="customer">Customer</MenuItem>
                        <MenuItem value="vendor">Vendor</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
            {/* 2. Basis that then Select Customer or Vendor Name */}
            <Grid item xs={12} sm={3}>
                <Autocomplete
                    size="small"
                    disabled={!filterBasis}
                    options={filterNameOptions}
                    value={filterName}
                    onChange={(event, newValue) => setFilterName(newValue)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={filterBasis === "vendor" ? "Vendor Name" : "Customer Name"}
                            placeholder={filterBasis ? "All" : "Pick a filter basis first"}
                        />
                    )}
                />
            </Grid>
            {/* 3. Filter to select their contract term pending > or < # months */}
            <Grid item xs={6} sm={2}>
                <FormControl fullWidth size="small" disabled={!filterBasis}>
                    <InputLabel id="finance-pending-operator-label">Pending</InputLabel>
                    <Select
                        labelId="finance-pending-operator-label"
                        label="Pending"
                        value={pendingOperator}
                        onChange={(event) => setPendingOperator(event.target.value)}
                    >
                        <MenuItem value=">">&gt; (more than)</MenuItem>
                        <MenuItem value="<">&lt; (less than)</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={6} sm={2}>
                <TextField
                    fullWidth
                    size="small"
                    type="number"
                    disabled={!filterBasis}
                    label="# Months"
                    placeholder="e.g. 3"
                    value={pendingThreshold}
                    onChange={(event) => setPendingThreshold(event.target.value)}
                />
            </Grid>
            <Grid item xs={12} sm={2} sx={{ display: "flex", alignItems: "center" }}>
                <FormControlLabel
                    control={<Checkbox size="small" checked={onlyGapRows} onChange={(event) => setOnlyGapRows(event.target.checked)} />}
                    label={<Typography variant="body2" sx={{ fontSize: "0.75rem" }}>Only Contract Gap rows</Typography>}
                />
            </Grid>
            {/* "Sorting the List in Ascending or Descending order by Contract
                Pending (Months) for both customer and supplier" */}
            <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                    <InputLabel id="finance-sort-field-label">Sort by</InputLabel>
                    <Select
                        labelId="finance-sort-field-label"
                        label="Sort by"
                        value={sortField}
                        onChange={(event) => setSortField(event.target.value)}
                    >
                        <MenuItem value=""><em>None</em></MenuItem>
                        <MenuItem value="customerContractPendingMonths">Customer Contract Pending (Months)</MenuItem>
                        <MenuItem value="vendorContractPendingMonths">Vendor Contract Pending (Months)</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small" disabled={!sortField}>
                    <InputLabel id="finance-sort-direction-label">Order</InputLabel>
                    <Select
                        labelId="finance-sort-direction-label"
                        label="Order"
                        value={sortDirection}
                        onChange={(event) => setSortDirection(event.target.value)}
                    >
                        <MenuItem value="asc">Ascending</MenuItem>
                        <MenuItem value="desc">Descending</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
            {/* "Give option to download this whole list in CSV file" */}
            <Grid item xs={12} sm={3} sx={{ display: "flex", alignItems: "center" }}>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadCsv}
                    disabled={loading || sortedRows.length === 0}
                >
                    Download CSV
                </Button>
            </Grid>
            <Grid item xs={12}>
                {error ? (
                    <Alert severity="error">Unable to load circuits</Alert>
                ) : loading ? (
                    <Typography variant="body2" sx={{ fontSize: "0.72rem" }}>Loading...</Typography>
                ) : (
                    <>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.72rem", mb: 0.5 }}>
                            {filteredRows.length === rows.length
                                ? `${rows.length} circuit${rows.length === 1 ? "" : "s"}`
                                : `${filteredRows.length} of ${rows.length} circuit${rows.length === 1 ? "" : "s"}`}
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: "calc(100vh - 300px)" }}>
                            <Table
                                size="small"
                                stickyHeader
                                sx={{
                                    tableLayout: "fixed",
                                    // A narrow fixed column stops content spilling out only if the
                                    // browser has somewhere to break the line - a long unbroken
                                    // value like a Vendor Circuit ID has no spaces to wrap at, so
                                    // without this it overflows and overlaps the next column.
                                    "& .MuiTableCell-root": { fontSize: "0.72rem", padding: "4px 8px", wordBreak: "break-word", overflowWrap: "anywhere" },
                                }}
                            >
                                <TableHead>
                                    <TableRow>
                                        {columns.map((column) => (
                                            <TableCell key={column.id} sx={{ fontWeight: 600, width: column.width }}>{column.label}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sortedRows.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={columns.length}>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
                                                    No circuits found
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {sortedRows.map((row) => (
                                        <TableRow key={row.id}>
                                            {columns.map((column) => (
                                                <TableCell key={column.id} sx={{ width: column.width }}>
                                                    {column.id === "siteName" && row.siteId ? (
                                                        <Link
                                                            component="button"
                                                            type="button"
                                                            underline="hover"
                                                            onClick={() => handleOpenSite(row.siteId, row.siteName)}
                                                            sx={{ fontSize: "inherit", verticalAlign: "baseline", textAlign: "left" }}
                                                        >
                                                            {row.siteName}
                                                        </Link>
                                                    ) : column.id.endsWith("ContractPendingMonths") && row[column.id] !== "-" && Number(row[column.id]) < 0 ? (
                                                        // Already past that side's Contract Term end date - flagged red
                                                        // so an expired contract stands out rather than reading as just
                                                        // another number.
                                                        <Typography component="span" variant="inherit" color="error.main" sx={{ fontSize: "inherit" }}>
                                                            {row[column.id]}
                                                        </Typography>
                                                    ) : row[column.id]}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.72rem", mt: 0.5, textAlign: "right" }}>
                            {sortedRows.length} Rows Found
                        </Typography>
                    </>
                )}
            </Grid>
        </Grid>
    )
}
