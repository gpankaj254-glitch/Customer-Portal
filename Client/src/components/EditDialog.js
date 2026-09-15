import * as React from "react"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography"
import PropTypes from "prop-types"
import _ from "lodash"

export default function EditDialog({ open, title, fields, initialValues, lastEditedNote, onSave, onCancel, loading }) {
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

    return (
        <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                {lastEditedNote && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                        {lastEditedNote}
                    </Typography>
                )}
                {resolvedFields.map((field) => (
                    <TextField
                        key={field.name}
                        select={field.type === "select"}
                        fullWidth
                        margin="dense"
                        label={field.label}
                        value={_.get(values, field.name, "")}
                        onChange={handleChange(field.name)}
                        disabled={loading}
                    >
                        {field.type === "select" && field.options.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                    </TextField>
                ))}
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
}

EditDialog.defaultProps = {
    title: "Edit",
    initialValues: {},
    lastEditedNote: null,
    loading: false,
}
