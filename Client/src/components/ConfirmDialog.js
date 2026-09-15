import * as React from "react"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogActions from "@mui/material/DialogActions"
import Button from "@mui/material/Button"
import PropTypes from "prop-types"

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel, loading }) {
    return (
        <Dialog open={open} onClose={onCancel}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{message}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} disabled={loading}>Cancel</Button>
                <Button onClick={onConfirm} color="error" variant="contained" disabled={loading} autoFocus>
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

ConfirmDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    title: PropTypes.string,
    message: PropTypes.node,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    confirmLabel: PropTypes.string,
    loading: PropTypes.bool,
}

ConfirmDialog.defaultProps = {
    title: "Confirm",
    message: "Are you sure?",
    confirmLabel: "Delete",
    loading: false,
}
