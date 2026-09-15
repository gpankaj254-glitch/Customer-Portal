import React from "react"
import PropTypes from "prop-types"
import Avatar from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Container from "@mui/material/Container"
import CssBaseline from "@mui/material/CssBaseline"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import LockResetIcon from "@mui/icons-material/LockReset"
import { LoadingButton } from "@mui/lab"
import { fetchResetPassword } from "./authAPI"

// Reached by the link in the password-reset email
// (<APP_URL>/reset-password?token=...) - App.jsx routes here directly off
// window.location.pathname, since this app has no client-side router.
export default function ResetPasswordPage({ token }) {
    const [password, setPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [submitting, setSubmitting] = React.useState(false)
    const [error, setError] = React.useState(null)
    const [success, setSuccess] = React.useState(false)

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }
        setSubmitting(true)
        setError(null)
        const { error: resetError } = await fetchResetPassword(token, password)
        setSubmitting(false)
        if (resetError) {
            setError(resetError)
            return
        }
        setSuccess(true)
    }

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
                    <LockResetIcon />
                </Avatar>
                <Typography component="h1" variant="h5">Reset Password</Typography>

                {!token ? (
                    <Alert severity="error" sx={{ mt: 3, width: "100%" }}>
                        This reset link is missing its token. Request a new one from the sign-in page.
                    </Alert>
                ) : success ? (
                    <>
                        <Alert severity="success" sx={{ mt: 3, width: "100%" }}>
                            Password reset successfully. You can now sign in with your new password.
                        </Alert>
                        <Button fullWidth variant="contained" sx={{ mt: 3 }} href="/">
                            Go to Sign In
                        </Button>
                    </>
                ) : (
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: "100%" }}>
                        <TextField
                            autoFocus
                            fullWidth
                            required
                            margin="normal"
                            type="password"
                            label="New Password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                        <TextField
                            fullWidth
                            required
                            margin="normal"
                            type="password"
                            label="Confirm New Password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                        />
                        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                        <LoadingButton
                            type="submit"
                            fullWidth
                            variant="contained"
                            loading={submitting}
                            sx={{ mt: 3, mb: 2 }}
                        >
                            Reset Password
                        </LoadingButton>
                    </Box>
                )}
            </Box>
        </Container>
    )
}

ResetPasswordPage.propTypes = {
    token: PropTypes.string,
}
