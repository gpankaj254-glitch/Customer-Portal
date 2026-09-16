import * as React from "react"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Autocomplete from "@mui/material/Autocomplete"
import Typography from "@mui/material/Typography"
import PropTypes from "prop-types"
import _ from "lodash"

export default function EditDialog({ open, title, fields, initialValues, lastEditedNote, onSave, onCancel, loading, dense }) {
    const [values, setValues] = React.useState(initialValues)

    React.useEffect(() => {
        if (open) {
            setValues(initialValues)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const handleChange = (name) => (event) => {
        setValues((prev) => ({ ...prev, [name]: event.target.value }))
    }

    // fields can be a static array, or a function of the live (in-progress)
    // values - the latter lets a field's own edit show/hide other fields,
    // e.g. a Role select revealing a Customer/Vendor picker once selected.
    const resolvedFields = typeof fields === "function" ? fields(values) : fields

    const inputSize = dense ? "small" : "medium"

    return (
        <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
            <DialogTitle sx={dense ? { fontSize: "1.1rem" } : undefined}>{title}</DialogTitle>
            <DialogContent>
                {lastEditedNote && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                        {lastEditedNote}
                    </Typography>
                )}
                {resolvedFields.map((field) => {
                    if (field.type === "autocomplete") {
                        const currentValue = _.get(values, field.name, "")
                        const selectedOption = field.options.find((option) => option.value === currentValue) || null
                        return (
                            <Autocomplete
                                key={field.name}
                                size={inputSize}
                                options={field.options}
                                getOptionLabel={(option) => option.label}
                                isOptionEqualToValue={(option, value) => option.value === value.value}
                                value={selectedOption}
                                onChange={(event, newValue) => {
                                    setValues((prev) => ({ ...prev, [field.name]: newValue ? newValue.value : "" }))
                                }}
                                disabled={loading || field.disabled}
                                renderInput={(params) => (
                                    <TextField {...params} label={field.label} margin="dense" fullWidth />
                                )}
                            />
                        )
                    }
                    return (
                        <TextField
                            key={field.name}
                            select={field.type === "select"}
                            type={field.type === "date" ? "date" : "text"}
                            InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
                            fullWidth
                            margin="dense"
                            size={inputSize}
                            label={field.label}
                            value={_.get(values, field.name, "")}
                            onChange={handleChange(field.name)}
                            disabled={loading || field.disabled}
                        >
                            {field.type === "select" && field.options.map((option) => (
                                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                            ))}
                        </TextField>
                    )
                })}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} disabled={loading}>Cancel</Button>
                <Button onClick={() => onSave(values)} variant="contained" disabled={loading}>Save</Button>
            </DialogActions>
        </Dialog>
    )
}

EditDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    title: PropTypes.string,
    fields: PropTypes.oneOfType([PropTypes.array, PropTypes.func]).isRequired,
    initialValues: PropTypes.object,
    lastEditedNote: PropTypes.string,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    dense: PropTypes.bool,
}

EditDialog.defaultProps = {
    title: "Edit",
    initialValues: {},
    lastEditedNote: null,
    loading: false,
    dense: false,
}
