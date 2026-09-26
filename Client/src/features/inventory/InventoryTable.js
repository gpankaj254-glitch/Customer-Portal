/* eslint-disable no-unused-vars */
import * as React from "react"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import PropTypes from "prop-types"
import {changeLimit, changePage, getSites, selectGetSiteError, selectSiteList, selectPageStatus, selectFocusSiteId, clearFocusSite} from "./inventorySlice"
import { useSelector, useDispatch } from "react-redux"
import { Alert, Box, Button, Collapse, IconButton, Typography} from "@mui/material"
import DownloadIcon from "@mui/icons-material/Download"
import { pageStatusVals} from "./utils"
import _ from "lodash"
import moment from "moment"
import {  KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material"
import CircuitTable from "./CircuitTable"
import { combineAddress } from "../../utils/address"
import { downloadCsv } from "../../utils/csv"
import { circuitCsvColumns, buildCircuitCsvRow } from "../../utils/circuitDisplay"
import { getVendors, selectVendorList } from "../vendors/vendorSlice"
import { useCircuitFieldOptions } from "./circuitActions"

const columns = [
    { id: "icon", label: ""},
    { id: "customer", label: "Customer Name"},
    { id: "endUser", label: "End User"},
    { id: "siteId", label: "Site Name"},
    { id: "address", label: "Site Address", maxWidth: 2},
    { id: "circuits", label: "Circuit Count"},

]

// A circuit with no stored status yet is "Live" (the schema default - see
// circuit.model.js), same fallback used everywhere else this is checked
// (CircuitTable.js's formatCircuitStatus).
function matchesStatusFilter(circuit, statusFilter) {
    return !statusFilter || (circuit.status || "Live") === statusFilter
}

// "Live Inventory"/"Changed Inventory"/"Ceased Inventory" - when
// statusFilter is set, the Circuit Count shown here is that site's matching
// circuits only, not its total (row.circuitCount), so it doesn't read as a
// mismatch against what's actually shown once the row is expanded.
function createDisplayData (data, statusFilter) {
    const circuitCount = statusFilter
        ? (data.circuitList || []).filter((circuit) => matchesStatusFilter(circuit, statusFilter)).length
        : _.get(data, "circuitCount", "")
    return {
        customer : _.get(data, "customer.name", ""),
        region : _.get(data, "region.name", ""),
        endUser : _.get(data, "customerSiteIdentifier", ""),
        siteId : _.get(data, "name", ""),
        circuits : circuitCount,
        address : combineAddress(_.get(data, "location", {})),

    }

}


export default function InventoryTable(props) {

    const status = useSelector(selectPageStatus)
    const errorMessage = useSelector(selectGetSiteError)
    const allSiteList = useSelector(selectSiteList)
    const pagination = props.pagination
    const details = props.details
    const statusFilter = props.statusFilter
    // "Give CSV Download options for Inventory ... only to SCX Admin User" -
    // set by Inventory.js from the viewer's own role.
    const canDownloadCsv = props.canDownloadCsv
    // Dispatched here (mounted at most 3x - once per Live/Changed/Ceased
    // Site Inventory tab), not inside CircuitTable.js itself, which mounts
    // once per SITE ROW (200+ at once, always-mounted under Collapse) - see
    // useCircuitFieldOptions' own comment for why that would otherwise
    // fire hundreds of duplicate dispatches at once.
    useCircuitFieldOptions()

    // "Live Inventory"/"Changed Inventory"/"Ceased Inventory" - reuses the
    // same already-fetched siteList for all three (no separate fetch per
    // tab), filtered down to sites with at least one circuit in that
    // status, so a tab like Ceased Inventory doesn't list every site in the
    // system with nothing to show once expanded.
    const siteList = React.useMemo(() => {
        if (!statusFilter) {
            return allSiteList
        }
        return allSiteList.filter((site) => (site.circuitList || []).some((circuit) => matchesStatusFilter(circuit, statusFilter)))
    }, [allSiteList, statusFilter])

    const [open, setOpen] = React.useState(false)
    // const [details, setDetails] = React.useState(true)

    const dispatch = useDispatch()
    const focusSiteId = useSelector(selectFocusSiteId)
    const vendorList = useSelector(selectVendorList)
    const vendorNameById = React.useMemo(() => new Map(vendorList.map((vendor) => [vendor.id, vendor.name])), [vendorList])

    // Vendor Name is only otherwise fetched here when the viewer holds
    // createCircuits (see Inventory.js) - self-contained fetch (same
    // pattern as CircuitInventoryTable.js) so the CSV's Vendor Name column
    // is populated for every role that can see this table, not just Admin.
    React.useEffect(() => {
        dispatch(getVendors({ limit: 1000, page: 1 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // "Download Circuit Inventory Option - CSV in all Tabs ... Live Site
    // Inventory, Changed Site Inventory and Ceased Site Inventory" - flattens
    // the currently-loaded (already statusFilter-matching) sites' own nested
    // circuitList into the same circuit-level CSV shape CircuitInventoryTable
    // downloads, rather than a site-level export - "Circuit Inventory" is
    // circuit data regardless of which tab (site- or circuit-centric) it's
    // downloaded from.
    const csvRows = React.useMemo(() => {
        const rows = []
        siteList.forEach((site) => {
            const customerName = _.get(site, "customer.name", "")
            const address = combineAddress(_.get(site, "location", {}))
            const circuits = statusFilter
                ? (site.circuitList || []).filter((circuit) => matchesStatusFilter(circuit, statusFilter))
                : (site.circuitList || [])
            circuits.forEach((circuit) => {
                rows.push(buildCircuitCsvRow(circuit, {
                    customerName,
                    address,
                    vendorName: vendorNameById.get(circuit.vendorId) || "",
                }))
            })
        })
        return rows
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteList, statusFilter, vendorNameById])

    const handleDownloadCsv = () => {
        // Change Type is meaningful for a Changed or Ceased circuit only -
        // same as CircuitInventoryTable's own showChangeType (Live has
        // nothing to show there).
        const csvColumns = circuitCsvColumns(statusFilter === "Changed" || statusFilter === "Ceased")
        const headers = csvColumns.map((column) => column.label)
        const rows = csvRows.map((row) => csvColumns.map((column) => row[column.id]))
        downloadCsv(`circuit-inventory-${moment().format("YYYY-MM-DD")}.csv`, headers, rows)
    }

    // Arriving from another page for a specific site (see the Finance
    // dashboard's Site Name link, via inventorySlice's focusSite): expand
    // its circuits as soon as its row is in the (search-filtered) list.
    React.useEffect(() => {
        if (!focusSiteId) {
            return
        }
        const match = siteList.find((site) => site.id === focusSiteId)
        if (match) {
            setOpen(match.id)
            dispatch(clearFocusSite())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteList, focusSiteId])

    const handleChangePage = (event, newPage) => {    
        const data = {
            limit: pagination.limit,
            page: pagination.page +1
        }
        dispatch(changePage(newPage))
        dispatch(getSites(data))
    }

    const handleChangeRowsPerPage = (event) => {
        dispatch(changeLimit(event.target.value))
    }

    const handleRowClick = (event, rowId) => {
        console.log("event"+ JSON.stringify(rowId))
        if (open === rowId){
            setOpen(false)
        } else {
            setOpen(rowId)
        }
    }

    function createDataRow (row) {
        const displayData = createDisplayData(row, statusFilter)
        return (<TableRow key={row.id} >
             {details && (<TableCell>
                <IconButton onClick={(event) => handleRowClick(event, row.id)}
                >
                    {open === row.id ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                </IconButton>
            </TableCell>)}
            {
                columns.map((column) => (
                    <TableCell
                        key={`${row.id}${column.id}`}
                    >
                        <Typography variant="body2">{_.get(displayData, column.id, "")}
                        </Typography>
                    </TableCell>
                ))}
        </TableRow>)


    }

    // React.useEffect(() => {
    //     const data = {
    //         limit: pagination.limit,
    //         page: pagination.page +1
    //     }
    //     dispatch(getSites(data))
    // }, [])

    if (errorMessage) {
        return <Alert severity="error">{errorMessage}</Alert>
    } else if (status === pageStatusVals.loading) {
        return <div>loading</div>
    } else if (status === pageStatusVals.fetched) {
        return (
            <Paper sx={{ width: "100%", overflow: "hidden" }}>
                {/* "Download Circuit Inventory Option - CSV in all Tabs" -
                    "only to SCX Admin User" */}
                {canDownloadCsv && (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={handleDownloadCsv}
                            disabled={csvRows.length === 0}
                        >
                            Download CSV
                        </Button>
                    </Box>
                )}
                <TableContainer sx={{ height: 1 }}>
                    <Table stickyHeader aria-label="sticky table">
                        <TableHead>
                            <TableRow>
                                {details && (<TableCell>
                                </TableCell>)}
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        // align="left"
                                        style={{ minWidth: column.minWidth}}
                                    >
                                        <Typography variant="h6">{column.label}
                                        </Typography>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {siteList.map((row) => (
                                <React.Fragment key={`${row.code}-div`}>
                                    {createDataRow(row)}
                                    {details && <TableRow key={`${row.id}-collapse`} >
                                        <TableCell style={{ paddingBottom: 0, paddingTop: 0, maxWidth: 1 }} colSpan={columns.length + 1}>
                                            <Collapse in = {open === row.id}>
                                            <CircuitTable
                                                circuitList={statusFilter ? (row.circuitList || []).filter((circuit) => matchesStatusFilter(circuit, statusFilter)) : row.circuitList}
                                                site={row}
                                            ></CircuitTable>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>}
                                </React.Fragment>
                            ))}

                        </TableBody>
                    </Table>
                    {/* {payload.results} */}
                </TableContainer>
                {details && <TablePagination
                    rowsPerPageOptions={false}
                    component="div"
                    // "Same issue in Live, Changed, Ceased Site Inventory
                    // list" - pagination.totalResults is one shared Redux
                    // field holding every site's own total (getSites is
                    // fetched once, unfiltered, and reused by all three
                    // tabs - see siteList above), not this tab's own
                    // statusFilter-matching count, so it always showed the
                    // Live Site Inventory number even on Changed/Ceased.
                    // siteList.length is already this tab's own correct,
                    // filtered count (same fix as DeliveryOrderTable.js's
                    // own pagination).
                    count={siteList.length}
                    rowsPerPage={pagination.limit}
                    page={pagination.page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />}
            </Paper>
        )
    }
}

InventoryTable.propTypes = {
    pagination: PropTypes.object,
    open: PropTypes.bool,
    details: PropTypes.bool,
    handleToggle: PropTypes.func,
    // "Live"/"Changed"/"Ceased" - restricts both which sites are listed
    // (only ones with a matching circuit) and which of that site's circuits
    // show once expanded. Omitted (falsy) shows everything, unfiltered.
    statusFilter: PropTypes.string,
    // "Give CSV Download options for Inventory ... only to SCX Admin User" -
    // set by Inventory.js from the viewer's own role.
    canDownloadCsv: PropTypes.bool,
}