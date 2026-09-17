import * as React from "react"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import TextField from "@mui/material/TextField"
import IconButton from "@mui/material/IconButton"
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber"
import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box"
import PropTypes from "prop-types"
import _ from "lodash"
import { useSelector, useDispatch } from "react-redux"
import { getSites, selectSiteList } from "../inventory/inventorySlice"

function flattenCircuits(siteList) {
    const rows = []
    siteList.forEach((site) => {
        (site.circuitList || []).forEach((circuit) => {
            rows.push({
                ...circuit,
                site: { id: site.id, name: site.name, code: site.code },
                customer: site.customer,
                location: site.location,
            })
        })
    })
    return rows
}

export default function CircuitSelectList({ onSelectCircuit }) {
    const dispatch = useDispatch()
    const siteList = useSelector(selectSiteList)

    // The committed search term (what's actually sent to the server) is
    // kept separate from the text box's live value so the fetch only fires
    // 400ms after the user stops typing - same debounce pattern as
    // Sites.js/InventoryTable.js. The server-side search (site.controller.js)
    // checks every Site field and every Circuit field (Vendor Circuit ID,
    // SCloudX Order Reference, etc.), so unlike the old client-only filter
    // this isn't limited to a handful of fields or the first 200 rows.
    const [searchInput, setSearchInput] = React.useState("")
    const [search, setSearch] = React.useState("")

    React.useEffect(() => {
        dispatch(getSites({ limit: 200, page: 1, search }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search])

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setSearch(searchInput)
        }, 400)
        return () => clearTimeout(timeout)
    }, [searchInput])

    const rows = React.useMemo(() => flattenCircuits(siteList), [siteList])

    return (
        <Box>
            <Typography variant="h5" gutterBottom>Create Ticket</Typography>
            <TextField
                fullWidth
                label="Search Inventory"
                placeholder="Search any site or circuit field - name, address, Vendor Circuit ID, SCloudX Order Reference, etc."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                sx={{ mb: 2 }}
            />
            <Paper sx={{ width: "100%", overflow: "hidden" }}>
                <TableContainer sx={{ maxHeight: 500 }}>
                    <Table
                        stickyHeader
                        size="small"
                        sx={{ "& .MuiTableCell-root": { fontSize: "0.75rem", padding: "4px 8px" } }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Create Ticket</TableCell>
                                <TableCell>Site Name</TableCell>
                                <TableCell>Circuit ID</TableCell>
                                <TableCell>Customer Order Number</TableCell>
                                <TableCell>Product</TableCell>
                                <TableCell>Bandwidth</TableCell>
                                <TableCell>Site Address</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <IconButton
                                            aria-label={`create ticket ${row.vendorCircuitId || row.code}`}
                                            color="primary"
                                            size="small"
                                            onClick={() => onSelectCircuit(row)}
                                        >
                                            <ConfirmationNumberIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                    <TableCell>{_.get(row, "site.name", "")}</TableCell>
                                    <TableCell>{row.vendorCircuitId || row.code}</TableCell>
                                    <TableCell>{row.customerOrderReference}</TableCell>
                                    <TableCell>{row.product}</TableCell>
                                    <TableCell>{row.bandwidth}</TableCell>
                                    <TableCell>{_.get(row, "location.address", "")}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    )
}

CircuitSelectList.propTypes = {
    onSelectCircuit: PropTypes.func.isRequired,
}
