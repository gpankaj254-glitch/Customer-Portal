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

    const [search, setSearch] = React.useState("")

    React.useEffect(() => {
        dispatch(getSites({ limit: 200, page: 1 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const rows = React.useMemo(() => flattenCircuits(siteList), [siteList])

    const filteredRows = React.useMemo(() => {
        if (!search) return rows
        const term = search.toLowerCase()
        return rows.filter((row) =>
            (row.vendorCircuitId || row.code || "").toLowerCase().includes(term)
            || (row.customerOrderReference || "").toLowerCase().includes(term)
            || _.get(row, "site.name", "").toLowerCase().includes(term)
            || _.get(row, "location.address", "").toLowerCase().includes(term)
        )
    }, [rows, search])

    return (
        <Box>
            <Typography variant="h5" gutterBottom>Create Ticket</Typography>
            <TextField
                fullWidth
                label="Search Inventory"
                placeholder="Search by circuit, site name, or address"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
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
                            {filteredRows.map((row) => (
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
