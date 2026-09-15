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
import EditIcon from "@mui/icons-material/Edit"
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box"
import PropTypes from "prop-types"
import _ from "lodash"
import { useSelector, useDispatch } from "react-redux"
import { getSites, selectSiteList } from "../inventory/inventorySlice"
import { updateCircuit } from "../inventory/circuitSlice"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { bandwidthOptions, productOptions } from "../../consts/circuitOptions"
import EditDialog from "../../components/EditDialog"

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

// Legacy circuits (imported before the predefined lists existed) can hold a
// bandwidth/product value outside bandwidthOptions/productOptions - include
// it as an extra option so the Edit dropdown doesn't silently blank it out.
function selectFieldOptions(predefinedOptions, currentValue) {
    const options = [{ value: "", label: "None" }, ...predefinedOptions.map((option) => ({ value: option, label: option }))]
    if (currentValue && !predefinedOptions.includes(currentValue)) {
        options.push({ value: currentValue, label: `${currentValue} (legacy)` })
    }
    return options
}

function buildEditableFields(circuit) {
    return [
        { name: "vendorCircuitId", label: "Vendor Circuit ID" },
        { name: "customerCircuitId", label: "Customer Circuit ID" },
        { name: "scloudxOrderReference", label: "SCloudX Order Reference" },
        { name: "vendorOrderReference", label: "Vendor Order Reference" },
        { name: "customerOrderReference", label: "Customer Order Reference" },
        { name: "vendorLECName", label: "Vendor LEC Name" },
        {
            name: "bandwidth",
            label: "Bandwidth",
            type: "select",
            options: selectFieldOptions(bandwidthOptions, _.get(circuit, "bandwidth")),
        },
        {
            name: "product",
            label: "Product",
            type: "select",
            options: selectFieldOptions(productOptions, _.get(circuit, "product")),
        },
        { name: "vendorUptime", label: "Vendor Uptime" },
        { name: "vendorMTTR", label: "Vendor MTTR" },
    ]
}

export default function CircuitSelectList({ onSelectCircuit }) {
    const dispatch = useDispatch()
    const siteList = useSelector(selectSiteList)
    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN

    const [search, setSearch] = React.useState("")
    const [circuitToEdit, setCircuitToEdit] = React.useState(null)
    const [saving, setSaving] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)

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

    const refreshInventory = () => {
        dispatch(getSites({ limit: 200, page: 1 }))
    }

    const handleSaveEdit = async (values) => {
        setSaving(true)
        try {
            await dispatch(updateCircuit({ circuitId: circuitToEdit.id, ...values })).unwrap()
            setFeedback({ severity: "success", message: "Circuit updated successfully" })
            setCircuitToEdit(null)
            refreshInventory()
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to update circuit" })
        } finally {
            setSaving(false)
        }
    }

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
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Site Name</TableCell>
                                <TableCell>Circuit ID</TableCell>
                                <TableCell>Customer Order Number</TableCell>
                                <TableCell>Product</TableCell>
                                <TableCell>Bandwidth</TableCell>
                                <TableCell>Site Address</TableCell>
                                <TableCell>Create Ticket</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredRows.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{_.get(row, "site.name", "")}</TableCell>
                                    <TableCell>{row.vendorCircuitId || row.code}</TableCell>
                                    <TableCell>{row.customerOrderReference}</TableCell>
                                    <TableCell>{row.product}</TableCell>
                                    <TableCell>{row.bandwidth}</TableCell>
                                    <TableCell>{_.get(row, "location.address", "")}</TableCell>
                                    <TableCell>
                                        {isAdmin && (
                                            <IconButton
                                                aria-label={`edit ${row.vendorCircuitId || row.code}`}
                                                onClick={() => setCircuitToEdit(row)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                        <IconButton
                                            aria-label={`create ticket ${row.vendorCircuitId || row.code}`}
                                            color="primary"
                                            onClick={() => onSelectCircuit(row)}
                                        >
                                            <ConfirmationNumberIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
            <EditDialog
                open={!!circuitToEdit}
                title="Edit circuit"
                fields={buildEditableFields(circuitToEdit)}
                initialValues={circuitToEdit ? _.pick(circuitToEdit, buildEditableFields(circuitToEdit).map((field) => field.name)) : {}}
                onSave={handleSaveEdit}
                onCancel={() => setCircuitToEdit(null)}
                loading={saving}
            />
            <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Box>
    )
}

CircuitSelectList.propTypes = {
    onSelectCircuit: PropTypes.func.isRequired,
}
