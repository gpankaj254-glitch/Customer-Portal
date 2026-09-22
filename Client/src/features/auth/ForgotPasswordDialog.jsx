import React from "react"
import PropTypes from "prop-types"
import Box from "@mui/material/Box"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import Typography from "@mui/material/Typography"
import { LoadingButton } from "@mui/lab"
import { fetchForgotPassword, fetchResetPassword } from "./authAPI"
import PasswordField from "../../components/PasswordField"

// Email sending isn't configured yet (see Server/src/services/email.service.js) -
// outside production, /auth/forgot-password returns the reset link directly
// so this flow stays usable until a real provider is wired up.
export default function ForgotPasswordDialog({ open, onClose }) {
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [resetToken, setResetToken] = React.useState(null)
    const [submitting, setSubmitting] = React.useState(false)
    const [error, setError] = React.useState(null)
    const [success, setSuccess] = React.useState(false)

    const handleClose = () => {
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        setResetToken(null)
        setError(null)
        setSuccess(false)
        onClose()
    }

    const handleRequestReset = async (event) => {
        event.preventDefault()
        setSubmitting(true)
        setError(null)
        const { data, error: requestError } = await fetchForgotPassword(email)
        setSubmitting(false)
        if (requestError) {
            setError(requestError)
            return
        }
        if (data && data.resetPasswordToken) {
            setResetToken(data.resetPasswordToken)
        } else {
            // A real email provider is configured and has already sent the link.
            setSuccess(true)
        }
    }

    const handleResetPassword = async (event) => {
        event.preventDefault()
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }
        setSubmitting(true)
        setError(null)
        const { error: resetError } = await fetchResetPassword(resetToken, password)
        setSubmitting(false)
        if (resetError) {
            setError(resetError)
            return
        }
        setResetToken(null)
        setSuccess(true)
    }

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
            <DialogTitle>Reset Password</DialogTitle>
            {success ? (
                <>
                    <DialogContent>
                        <Alert severity="success">Password reset successfully. You can now sign in with your new password.</Alert>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Close</Button>
                    </DialogActions>
                </>
            ) : resetToken ? (
                <Box component="form" onSubmit={handleResetPassword}>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Email sending isn&apos;t configured yet, so the reset step is unlocked directly. Enter your new password below.
                        </Typography>
                        <PasswordField
                            autoFocus
                            fullWidth
                            required
                            margin="normal"
                            label="New Password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                        <PasswordField
                            fullWidth
                            required
                            margin="normal"
                            label="Confirm New Password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                        />
                        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancel</Button>
                        <LoadingButton type="submit" variant="contained" loading={submitting}>Reset Password</LoadingButton>
                    </DialogActions>
                </Box>
            ) : (
                <Box component="form" onSubmit={handleRequestReset}>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Enter your account email and we&apos;ll get you back in.
                        </Typography>
                        <TextField
                            autoFocus
                            fullWidth
                            required
                            margin="normal"
                            type="email"
                            label="Email Address"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancel</Button>
                        <LoadingButton type="submit" variant="contained" loading={submitting}>Send Reset Link</LoadingButton>
                    </DialogActions>
                </Box>
            )}
        </Dialog>
    )
}

ForgotPasswordDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
}
