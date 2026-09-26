import * as React from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
import Select from "@mui/material/Select"
import MenuItem from "@mui/material/MenuItem"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import { useDispatch, useSelector } from "react-redux"
import {
    getManagedCircuitOptions,
    getCircuitOptionNames,
    createCircuitOption,
    renameCircuitOption,
    deactivateCircuitOption,
    selectManagedCircuitOptions,
    selectManagedCircuitOptionsStatus,
} from "./circuitOptionSlice"
import ConfirmDialog from "../../components/ConfirmDialog"

// One tab's worth of UI (Products or Bandwidths) - identical for both,
// parameterized by `type` and its own display label.
function CircuitOptionPanel({ type, label }) {
    const dispatch = useDispatch()
    const options = useSelector(selectManagedCircuitOptions(type))
    const status = useSelector(selectManagedCircuitOptionsStatus(type))

    const [newName, setNewName] = React.useState("")
    const [adding, setAdding] = React.useState(false)
    // "To Edit/Delete Product or Bandwidth, Through Action Tab, ... Show
    // existing from Dropdown and ask for delete or ask new value to
    // Change" - one dropdown picks WHICH existing name the Edit/Delete
    // buttons below then act on, rather than a pencil/trash icon on every
    // row (the read-only list below is now just a reference).
    const [selectedId, setSelectedId] = React.useState("")
    const [editing, setEditing] = React.useState(false)
    const [editingName, setEditingName] = React.useState("")
    const [saving, setSaving] = React.useState(false)
    const [optionToRemove, setOptionToRemove] = React.useState(null)
    const [removing, setRemoving] = React.useState(false)
    const [feedback, setFeedback] = React.useState(null)

    const selectedOption = options.find((option) => option.id === selectedId) || null

    React.useEffect(() => {
        dispatch(getManagedCircuitOptions(type))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type])

    // A rename/removal (or switching tabs) can leave selectedId pointing at
    // an option that's no longer in the list - drop the stale selection
    // instead of the dropdown silently showing nothing selected.
    React.useEffect(() => {
        if (selectedId && !options.some((option) => option.id === selectedId)) {
            setSelectedId("")
            setEditing(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options])

    // "Once this is changed, these values should be visible in various
    // dropdown menus" - every dropdown reads the merged list via its own
    // getCircuitOptionNames dispatch, so a fresh add/rename/deactivate here
    // re-fetches it too, keeping this tab and every other open page's
    // dropdown in sync without a full reload.
    const refreshNames = () => dispatch(getCircuitOptionNames(type))

    const handleAdd = async () => {
        if (!newName.trim()) return
        setAdding(true)
        try {
            await dispatch(createCircuitOption({ type, name: newName.trim() })).unwrap()
            setNewName("")
            refreshNames()
            setFeedback({ severity: "success", message: `${label} added` })
        } catch (err) {
            setFeedback({ severity: "error", message: err || `Failed to add ${label.toLowerCase()}` })
        } finally {
            setAdding(false)
        }
    }

    const handleSelectChange = (event) => {
        setSelectedId(event.target.value)
        setEditing(false)
    }

    const startEdit = () => {
        if (!selectedOption) return
        setEditingName(selectedOption.name)
        setEditing(true)
    }

    const cancelEdit = () => {
        setEditing(false)
        setEditingName("")
    }

    const handleRename = async () => {
        if (!selectedOption || !editingName.trim()) return
        setSaving(true)
        try {
            await dispatch(renameCircuitOption({ type, id: selectedOption.id, name: editingName.trim() })).unwrap()
            cancelEdit()
            refreshNames()
            setFeedback({ severity: "success", message: `${label} renamed` })
        } catch (err) {
            setFeedback({ severity: "error", message: err || `Failed to rename ${label.toLowerCase()}` })
        } finally {
            setSaving(false)
        }
    }

    const handleConfirmRemove = async () => {
        setRemoving(true)
        try {
            await dispatch(deactivateCircuitOption({ type, id: optionToRemove.id })).unwrap()
            setOptionToRemove(null)
            setSelectedId("")
            refreshNames()
            setFeedback({ severity: "success", message: `${label} removed` })
        } catch (err) {
            setFeedback({ severity: "error", message: err || `Failed to remove ${label.toLowerCase()}` })
        } finally {
            setRemoving(false)
        }
    }

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                    Every {label.toLowerCase()} name currently offered in dropdowns - including the original
                    built-in ones - can be renamed or removed below via the Action section&apos;s dropdown.
                    Renaming/removing doesn&apos;t change any {label.toLowerCase()} already saved on an existing
                    Circuit, Delivery Order or Opportunity.
                </Typography>
            </Grid>
            <Grid item xs={12} sm={8} md={6}>
                <TextField
                    fullWidth
                    label={`New ${label} Name`}
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") handleAdd() }}
                />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
                <Button variant="contained" fullWidth disabled={adding || !newName.trim()} onClick={handleAdd} sx={{ height: "100%" }}>
                    {adding ? "Adding..." : "Add"}
                </Button>
            </Grid>

            <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mt: 1 }}>Action</Typography>
            </Grid>
            <Grid item xs={12} sm={8} md={6}>
                <FormControl fullWidth disabled={options.length === 0}>
                    <InputLabel id={`${type}-action-select-label`}>{`Select ${label} to Edit or Delete`}</InputLabel>
                    <Select
                        labelId={`${type}-action-select-label`}
                        label={`Select ${label} to Edit or Delete`}
                        value={selectedId}
                        onChange={handleSelectChange}
                    >
                        {options.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                                {option.name}{option.builtIn ? " (Built-in)" : ""}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            {selectedOption && !editing && (
                <Grid item xs={12} sm={4} md={6} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Button variant="outlined" onClick={startEdit}>Edit</Button>
                    <Button variant="outlined" color="error" onClick={() => setOptionToRemove(selectedOption)}>Delete</Button>
                </Grid>
            )}
            {selectedOption && editing && (
                <>
                    <Grid item xs={12} sm={8} md={6}>
                        <TextField
                            fullWidth
                            label={`New ${label} Value`}
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            onKeyDown={(event) => { if (event.key === "Enter") handleRename() }}
                            autoFocus
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={6} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        <Button variant="contained" disabled={saving || !editingName.trim()} onClick={handleRename}>
                            {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button variant="outlined" disabled={saving} onClick={cancelEdit}>Cancel</Button>
                    </Grid>
                </>
            )}

            {status === "loading" && (
                <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Loading...</Typography>
                </Grid>
            )}

            <ConfirmDialog
                open={!!optionToRemove}
                title={`Remove ${label.toLowerCase()}`}
                message={`Remove "${optionToRemove && optionToRemove.name}" from the ${label} list? It stops appearing in dropdowns, but anything already saved with this value is unaffected.`}
                onConfirm={handleConfirmRemove}
                onCancel={() => setOptionToRemove(null)}
                loading={removing}
            />

            <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Grid>
    )
}

// "Create Product Management Function for SCX Admin. Allow Admin to Create/
// Change New/Existing Product Name and allow to Add/Change Bandwidth Name.
// Once this is changed, these values should be visible in various dropdown
// menus" - "independent like NOC/Delivery management, visible at Left side
// of Admin Login" (see SideMenu.js/permissions.js - SCX Admin only).
export default function ProductManagement() {
    const [activeTab, setActiveTab] = React.useState(0)

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography component="h1" variant="h5" gutterBottom>Product Management</Typography>
                    <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)} aria-label="product management">
                        <Tab label="Products" />
                        <Tab label="Bandwidths" />
                    </Tabs>
                </Grid>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        {activeTab === 0 ? (
                            <CircuitOptionPanel type="product" label="Product" />
                        ) : (
                            <CircuitOptionPanel type="bandwidth" label="Bandwidth" />
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    )
}
