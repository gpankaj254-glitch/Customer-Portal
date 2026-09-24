import * as React from "react"
import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Link from "@mui/material/Link"
import Alert from "@mui/material/Alert"
import Button from "@mui/material/Button"
import DownloadIcon from "@mui/icons-material/Download"
import PropTypes from "prop-types"
import _ from "lodash"
import moment from "moment"
import { useDispatch, useSelector } from "react-redux"
import { getCircuitsList, selectCircuitsList, selectCircuitsListStatus, selectCircuitsListError } from "./circuitSlice"
import { getVendors, selectVendorList } from "../vendors/vendorSlice"
import { pageStatusVals } from "./utils"
import { combineAddress } from "../../utils/address"
import { getFormattedStoredDate } from "../../utils/dates"
import { downloadCsv } from "../../utils/csv"
import { getCircuitStatusDate, getCircuitChangeTypeDisplay, circuitCsvColumns } from "../../utils/circuitDisplay"

// "if I put 100 Mbps+USA+Verizon) it should filter all circuits with 100
// Mbps BW in USA country and Verizon Vendor" - each "+"-separated term must
// match something in the row (any field), and every term must match -
// mirrors ScxDashboard's own matchesOpenTicketSearch, extended to several
// AND'ed terms instead of just one.
function matchesMultiTermSearch(row, rawSearch) {
    const terms = rawSearch.split("+").map((term) => term.trim().toLowerCase()).filter(Boolean)
    if (terms.length === 0) {
        return true
    }
    const haystacks = [
        row.customerName,
        row.scloudxOrderReference,
        row.customerOrderReference,
        row.product,
        row.bandwidth,
        row.vendorName,
        row.siteName,
        row.address,
        _.get(row, "location.country", ""),
        _.get(row, "location.town", ""),
        row.status,
        row.changeTypeDisplay,
        row.statusDateDisplay,
    ].map((value) => String(value || "").toLowerCase())
    return terms.every((term) => haystacks.some((haystack) => haystack.includes(term)))
}

// "Create New Tab - Live Circuit Inventory - for only those with status
// LIVE" / "Create Another Tab - Ceased Circuit Inventory" - a circuit-
// centric view (one row per circuit, across every site) rather than the
// rest of Inventory's site-centric tables. Shared by both new tabs, just
// parameterized by which statuses to include and whether Change Type is
// shown (only meaningful once a circuit has actually Changed).
// initialSearch/onOpenChangeOrder are the two ends of "Make 'Change Order
// Number' Clickable and ... it should display Information from Live Circuit
// Inventory for that Change Order Number" (see Inventory.js): the Live tab
// takes initialSearch (seeded from the clicked value - a Change Order
// Number is itself an SCX Order Ref Number on the new circuit it refers to,
// so the existing search already finds it via scloudxOrderReference), the
// Ceased tab takes onOpenChangeOrder (called with that value on click).
export default function CircuitInventoryTable({ statuses, showChangeType, initialSearch, onOpenChangeOrder }) {
    const dispatch = useDispatch()
    const circuits = useSelector(selectCircuitsList)
    const status = useSelector(selectCircuitsListStatus)
    const error = useSelector(selectCircuitsListError)
    const vendorList = useSelector(selectVendorList)
    const [searchInput, setSearchInput] = React.useState(initialSearch)

    React.useEffect(() => {
        dispatch(getVendors({ limit: 1000, page: 1 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const statusKey = statuses.join(",")
    React.useEffect(() => {
        dispatch(getCircuitsList({ statuses }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusKey])

    // Tab switches reuse this same component instance (same type/position in
    // Inventory.js's tree, just different props) rather than remounting it,
    // so the initial-value form of useState above only takes effect the
    // very first time this tab is ever shown - this effect is what actually
    // re-seeds the search box on every later click too.
    React.useEffect(() => {
        if (initialSearch) {
            setSearchInput(initialSearch)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSearch])

    const vendorNameById = React.useMemo(
        () => new Map(vendorList.map((vendor) => [vendor.id, vendor.name])),
        [vendorList]
    )

    const rows = React.useMemo(() => circuits.map((circuit) => ({
        id: circuit.id,
        customerName: _.get(circuit, "customer.name", ""),
        scloudxOrderReference: circuit.scloudxOrderReference || "",
        customerOrderReference: circuit.customerOrderReference || "",
        product: circuit.product || "",
        bandwidth: circuit.bandwidth || "",
        vendorName: vendorNameById.get(circuit.vendorId) || "",
        siteName: _.get(circuit, "site.name", ""),
        address: combineAddress(circuit.location || {}),
        location: circuit.location,
        status: circuit.status || "Live",
        changeType: circuit.changeType || "",
        changeOrderNumber: circuit.changeOrderNumber || "",
        changeTypeDisplay: getCircuitChangeTypeDisplay(circuit),
        statusDateDisplay: getFormattedStoredDate(getCircuitStatusDate(circuit)),
    })), [circuits, vendorNameById])

    const searchTerm = searchInput.trim().toLowerCase()
    const filteredRows = React.useMemo(
        () => rows.filter((row) => matchesMultiTermSearch(row, searchTerm)),
        [rows, searchTerm]
    )

    // "Download Circuit Inventory Option - CSV in all Tabs" - exports
    // exactly what's currently on screen (search applied), same columns as
    // the table below (changeType/statusDate map to this row shape's own
    // changeTypeDisplay/statusDateDisplay field names).
    const csvFieldByColumnId = { changeType: "changeTypeDisplay", statusDate: "statusDateDisplay" }
    const handleDownloadCsv = () => {
        const csvColumns = circuitCsvColumns(showChangeType)
        const headers = csvColumns.map((column) => column.label)
        const csvRows = filteredRows.map((row) => csvColumns.map((column) => row[csvFieldByColumnId[column.id] || column.id]))
        downloadCsv(`circuit-inventory-${moment().format("YYYY-MM-DD")}.csv`, headers, csvRows)
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>
    }

    const columnCount = showChangeType ? 10 : 9

    return (
        <Paper sx={{ width: "100%", overflow: "hidden", p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                {/* "Also Display Number if rows total/ filtered as 'Number
                    of Circuits' at top" - counts whatever's currently
                    shown, so it narrows along with the search below. */}
                <Typography variant="subtitle1">
                    Number of Circuits: {filteredRows.length}
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadCsv}
                    disabled={filteredRows.length === 0}
                >
                    Download CSV
                </Button>
            </Box>
            <TextField
                fullWidth
                label="Search"
                placeholder='Combine multiple fields with "+", e.g. 100 Mbps+USA+Verizon'
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                sx={{ mb: 2 }}
            />
            <TableContainer sx={{ maxHeight: 520 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><Typography variant="subtitle2">Customer Name</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">SCX Order Ref Number</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">Customer PO Number</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">Product</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">Bandwidth</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">Vendor Name</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">Address</Typography></TableCell>
                            <TableCell><Typography variant="subtitle2">Circuit Status</Typography></TableCell>
                            {showChangeType && (
                                <TableCell><Typography variant="subtitle2">Change Type</Typography></TableCell>
                            )}
                            <TableCell><Typography variant="subtitle2">Circuit Status Date</Typography></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {status === pageStatusVals.loading && (
                            <TableRow>
                                <TableCell colSpan={columnCount}>
                                    <Typography variant="body2" color="text.secondary">Loading...</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {status === pageStatusVals.fetched && filteredRows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={columnCount}>
                                    <Typography variant="body2" color="text.secondary">No circuits found</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredRows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.customerName}</TableCell>
                                <TableCell>{row.scloudxOrderReference}</TableCell>
                                <TableCell>{row.customerOrderReference}</TableCell>
                                <TableCell>{row.product}</TableCell>
                                <TableCell>{row.bandwidth}</TableCell>
                                <TableCell>{row.vendorName}</TableCell>
                                <TableCell sx={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{row.address}</TableCell>
                                <TableCell>{row.status}</TableCell>
                                {showChangeType && (
                                    <TableCell sx={{ wordBreak: "break-word" }}>
                                        {row.status === "Ceased" ? (
                                            "Customer Cease"
                                        ) : row.status === "Changed" ? (
                                            <>
                                                {row.changeType}
                                                {row.changeType && row.changeOrderNumber ? " - " : ""}
                                                {row.changeOrderNumber ? (
                                                    <Link
                                                        component="button"
                                                        type="button"
                                                        underline="hover"
                                                        onClick={() => onOpenChangeOrder && onOpenChangeOrder(row.changeOrderNumber)}
                                                        // A native <button> (component="button") isn't
                                                        // display:inline by default, so it was dropping to
                                                        // its own line instead of flowing after "Upgrade - "
                                                        // like normal text - this makes it behave like
                                                        // inline text instead, and strips the button's own
                                                        // chrome (border/background/padding).
                                                        sx={{
                                                            fontSize: "inherit",
                                                            fontFamily: "inherit",
                                                            verticalAlign: "baseline",
                                                            display: "inline",
                                                            p: 0,
                                                            border: 0,
                                                            background: "none",
                                                        }}
                                                    >
                                                        {row.changeOrderNumber}
                                                    </Link>
                                                ) : null}
                                            </>
                                        ) : null}
                                    </TableCell>
                                )}
                                <TableCell>{row.statusDateDisplay}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    )
}

CircuitInventoryTable.propTypes = {
    // e.g. ["Live"] or ["Changed", "Ceased"].
    statuses: PropTypes.arrayOf(PropTypes.string).isRequired,
    showChangeType: PropTypes.bool,
    // Seeds/re-seeds the search box - set on the Live tab by
    // Inventory.js's own onOpenChangeOrder handler.
    initialSearch: PropTypes.string,
    // Called with a Changed row's Change Order Number when its link is
    // clicked - only meaningful (and only rendered) on the Ceased tab.
    onOpenChangeOrder: PropTypes.func,
}

CircuitInventoryTable.defaultProps = {
    showChangeType: false,
    initialSearch: "",
    onOpenChangeOrder: undefined,
}
