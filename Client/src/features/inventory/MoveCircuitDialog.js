import * as React from "react"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Autocomplete from "@mui/material/Autocomplete"
import Checkbox from "@mui/material/Checkbox"
import FormControlLabel from "@mui/material/FormControlLabel"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import PropTypes from "prop-types"
import _ from "lodash"
import { useDispatch } from "react-redux"
import { moveCircuit } from "./circuitSlice"
import { fetchSitesOfCustomer } from "./circuitAPI"

// "Move to another site" for a circuit (SCX Admin / SCX User - see
// CircuitTable). Lists only the SAME customer's other sites - the server
// enforces that too - and can optionally re-point the circuit's existing
// tickets at the new site.
export default function MoveCircuitDialog({ open, circuit, site, onClose, onMoved }) {
    const dispatch = useDispatch()
    const [options, setOptions] = React.useState([])
    const [inputValue, setInputValue] = React.useState("")
    const [selectedSite, setSelectedSite] = React.useState(null)
    const [updateTickets, setUpdateTickets] = React.useState(true)
    const [loadingSites, setLoadingSites] = React.useState(false)
    const [moving, setMoving] = React.useState(false)
    const [error, setError] = React.useState(null)
    // Set once the move has succeeded. The confirmation is shown here in the
    // dialog (the list behind it is rebuilt on refresh, which would wipe any
    // message shown there), and the list is only refreshed when this closes.
    const [movedTo, setMovedTo] = React.useState(null)

    const customerId = _.get(site, "customer.id")
    const currentSiteId = _.get(site, "id")
    const circuitLabel = circuit ? (circuit.customerCircuitId || circuit.vendorCircuitId || circuit.code) : ""

    // Start fresh every time the dialog opens.
    React.useEffect(() => {
        if (open) {
            setSelectedSite(null)
            setInputValue("")
            setUpdateTickets(true)
            setError(null)
            setMovedTo(null)
        }
    }, [open])

    // Load this customer's sites; re-queried (debounced) as the user types.
    React.useEffect(() => {
        if (!open || !customerId) {
            return undefined
        }
        let cancelled = false
        const timeout = setTimeout(async () => {
            setLoadingSites(true)
            const { results, error: loadError } = await fetchSitesOfCustomer({ customerId, search: inputValue })
            if (cancelled) {
                return
            }
            setLoadingSites(false)
            if (loadError) {
                setError(loadError)
            } else {
                setOptions((results || []).filter((candidate) => candidate.id !== currentSiteId))
            }
        }, 300)
        return () => {
            cancelled = true
            clearTimeout(timeout)
        }
    }, [open, customerId, currentSiteId, inputValue])

    const handleMove = async () => {
        setMoving(true)
        setError(null)
        try {
            await dispatch(moveCircuit({ circuitId: circuit.id, siteId: selectedSite.id, updateTickets })).unwrap()
            setMovedTo(selectedSite)
        } catch (err) {
            setError(err || "Failed to move circuit")
        } finally {
            setMoving(false)
        }
    }

    const handleClose = () => {
        if (movedTo) {
            onMoved(movedTo)
        } else {
            onClose()
        }
    }

    if (movedTo) {
        return (
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogTitle>Circuit moved</DialogTitle>
                <DialogContent>
                    <Alert severity="success">
                        Circuit <strong>{circuitLabel}</strong> is now at <strong>{movedTo.name}</strong>.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} variant="contained">Close</Button>
                </DialogActions>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onClose={moving ? undefined : handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Move circuit to another site</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Circuit <strong>{circuitLabel}</strong> is currently at <strong>{_.get(site, "name", "")}</strong>.
                    Choose the site to move it to. Only this customer&apos;s other sites are listed.
                </Typography>
                <Autocomplete
                    options={options}
                    loading={loadingSites}
                    value={selectedSite}
                    onChange={(event, newSite) => setSelectedSite(newSite)}
                    inputValue={inputValue}
                    onInputChange={(event, newInput) => setInputValue(newInput)}
                    getOptionLabel={(option) => _.get(option, "name", "")}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    filterOptions={(all) => all}
                    noOptionsText="No other sites found"
                    renderInput={(params) => (
                        <TextField {...params} autoFocus label="Move to site" placeholder="Search sites" />
                    )}
                />
                <FormControlLabel
                    sx={{ mt: 1 }}
                    control={<Checkbox checked={updateTickets} onChange={(event) => setUpdateTickets(event.target.checked)} />}
                    label="Also update the site on this circuit's existing tickets"
                />
                {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={moving}>Cancel</Button>
                <Button onClick={handleMove} variant="contained" disabled={!selectedSite || moving}>
                    {moving ? "Moving..." : "Move"}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

MoveCircuitDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    circuit: PropTypes.object,
    site: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onMoved: PropTypes.func.isRequired,
}

MoveCircuitDialog.defaultProps = {
    circuit: null,
    site: null,
}
