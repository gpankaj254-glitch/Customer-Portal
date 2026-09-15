import * as React from "react"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import PropTypes from "prop-types"

// Mirrors the server's password rule (custom.validation.js): at least 8
// characters, with at least one letter and one number.
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

export default function ResetPasswordDialog({ open, userName, onSave, onCancel, loading }) {
    const [password, setPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [touched, setTouched] = React.useState(false)

    React.useEffect(() => {
        if (open) {
            setPassword("")
            setConfirmPassword("")
            setTouched(false)
        }
    }, [open])

    const passwordInvalid = touched && !PASSWORD_RULE.test(password)
    const mismatch = touched && password !== confirmPassword

    const handleSave = () => {
        setTouched(true)
        if (!PASSWORD_RULE.test(password) || password !== confirmPassword) return
        onSave(password)
    }

    return (
        <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
            <DialogTitle>Reset Password{userName ? ` - ${userName}` : ""}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    margin="dense"
                    type="password"
                    label="New Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    error={passwordInvalid}
                    helperText={passwordInvalid ? "At least 8 characters, with a letter and a number" : ""}
                    disabled={loading}
                />
                <TextField
                    fullWidth
                    margin="dense"
                    type="password"
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    error={mismatch}
                    helperText={mismatch ? "Passwords do not match" : ""}
                    disabled={loading}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} disabled={loading}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={loading}>Reset Password</Button>
            </DialogActions>
        </Dialog>
    )
}

ResetPasswordDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    userName: PropTypes.string,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    loading: PropTypes.bool,
}

ResetPasswordDialog.defaultProps = {
    userName: "",
    loading: false,
}
