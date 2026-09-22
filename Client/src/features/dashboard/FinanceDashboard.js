import * as React from "react"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import Link from "@mui/material/Link"
import Alert from "@mui/material/Alert"
import _ from "lodash"
import moment from "moment"
import { useDispatch, useSelector } from "react-redux"
import { getCircuitsList, selectCircuitsList, selectCircuitsListStatus, selectCircuitsListError } from "../inventory/circuitSlice"
import { getVendors, selectVendorList } from "../vendors/vendorSlice"
import { focusSite } from "../inventory/inventorySlice"
import { pageStatusVals } from "../inventory/utils"
import { togglePage } from "../landing/landingSlice"
import { pages } from "../../consts"

// Fixed column widths (see the Table's tableLayout: "fixed" below) so every
// row lines up under its header instead of each column auto-sizing to its
// own widest value - Vendor Circuit ID in particular is far narrower than
// its neighbours need to be.
const columns = [
    { id: "siteName", label: "Site Name", width: "12%" },
    { id: "customerName", label: "Customer Name", width: "12%" },
    { id: "vendorName", label: "Vendor Name", width: "11%" },
    { id: "vendorCircuitId", label: "Vendor Circuit ID", width: "9%" },
    { id: "customerCircuitBillStartDate", label: "Customer Bill Start Date", width: "12%" },
    { id: "vendorCircuitBillStartDate", label: "Vendor Bill Start Date", width: "12%" },
    { id: "customerCircuitContractTerm", label: "Customer Contract Term", width: "11%" },
    { id: "vendorCircuitContractTerm", label: "Vendor Contract Term", width: "11%" },
    { id: "contractPendingMonths", label: "Contract Pending (Months)", width: "10%" },
]

// Bill Start Date is stored "DD-MM-YYYY" (see circuit.service.js's
// BULK_DATE_FORMAT). Contract Term is mostly "NN Months" but isn't
// consistently structured real data (blank, "Coterm", "36-Months", "36
// mths", etc. all show up) - only the leading digit run is used, so
// anything with no digits at all can't be computed.
const CONTRACT_TERM_MONTHS = /(\d+)/

// "Contract Pending (Months)" = (Customer Bill Start Date + Customer
// Contract Term) - Today() - how many whole months are left before the
// customer-side contract term ends. Negative once it's already expired.
// Returns null when either input can't be parsed (blank/invalid date,
// non-numeric term like "Coterm").
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
// vendor name, Vendor Circuit ID, bill start dates, contract terms - see
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
        const pendingMonths = computeContractPendingMonths(circuit.customerCircuitBillStartDate, circuit.customerCircuitContractTerm)
        return {
            id: circuit.id,
            siteId: _.get(circuit, "site.id", ""),
            siteName: _.get(circuit, "site.name", ""),
            customerName: _.get(circuit, "customer.name", ""),
            vendorName: vendorNameById.get(circuit.vendorId) || "",
            vendorCircuitId: circuit.vendorCircuitId || "",
            customerCircuitBillStartDate: circuit.customerCircuitBillStartDate || "",
            vendorCircuitBillStartDate: circuit.vendorCircuitBillStartDate || "",
            customerCircuitContractTerm: circuit.customerCircuitContractTerm || "",
            vendorCircuitContractTerm: circuit.vendorCircuitContractTerm || "",
            contractPendingMonths: pendingMonths === null ? "-" : String(pendingMonths),
        }
    })

    const loading = status === pageStatusVals.loading || status === pageStatusVals.idle

    return (
        <Grid container spacing={1.5}>
            <Grid item xs={12}>
                <TextField
                    fullWidth
                    size="small"
                    label="Search circuits"
                    placeholder="Search by site, customer, vendor, Vendor Circuit ID, bill start date or contract term"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                />
            </Grid>
            <Grid item xs={12}>
                {error ? (
                    <Alert severity="error">Unable to load circuits</Alert>
                ) : loading ? (
                    <Typography variant="body2" sx={{ fontSize: "0.72rem" }}>Loading...</Typography>
                ) : (
                    <>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.72rem", mb: 0.5 }}>
                            {rows.length} circuit{rows.length === 1 ? "" : "s"}
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
                                    {rows.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={columns.length}>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
                                                    No circuits found
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {rows.map((row) => (
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
                                                    ) : column.id === "contractPendingMonths" && row[column.id] !== "-" && Number(row[column.id]) < 0 ? (
                                                        // Already past its Customer Contract Term end date - flagged red
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
                            {rows.length} Rows Found
                        </Typography>
                    </>
                )}
            </Grid>
        </Grid>
    )
}
