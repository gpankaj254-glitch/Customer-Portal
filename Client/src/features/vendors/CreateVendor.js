import * as React from "react"
import Button from "@mui/material/Button"
import CssBaseline from "@mui/material/CssBaseline"
import TextField from "@mui/material/TextField"
import Grid from "@mui/material/Grid"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Container from "@mui/material/Container"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import { useDispatch, useSelector } from "react-redux"
import { createVendor, getVendors, selectPagination } from "./vendorSlice"

export default function CreateVendor() {
    const dispatch = useDispatch()
    const pagination = useSelector(selectPagination)
    const [feedback, setFeedback] = React.useState(null)

    const handleSubmit = async (event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        try {
            await dispatch(createVendor({
                name: data.get("vendorName"),
                vendorUptime: data.get("vendorUptime"),
                vendorMTTR: data.get("vendorMTTR"),
            })).unwrap()
            setFeedback({ severity: "success", message: "Vendor created successfully" })
            form.reset()
            dispatch(getVendors({ limit: pagination.limit, page: pagination.page + 1 }))
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to create vendor" })
        }
    }

    return (
        <Container component="main" maxWidth="md">
            <CssBaseline />
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography component="h1" variant="h5">Create New Vendor</Typography>

                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <Grid container spacing={2} justifyContent="center">
                        <Grid item xs={12} sm={6}>
                            <TextField
                                autoComplete="given-name"
                                name="vendorName"
                                required
                                fullWidth
                                id="vendorName"
                                label="Name"
                                autoFocus
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                name="vendorUptime"
                                id="vendorUptime"
                                label="Vendor Uptime"
                                placeholder="99.90%"
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                name="vendorMTTR"
                                id="vendorMTTR"
                                label="Vendor MTTR"
                                placeholder="4 Hrs"
                            />
                        </Grid>

                        <Grid item xs={12} sm={12}>
                            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                                Create Vendor
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Box>

            <Snackbar
                open={!!feedback}
                autoHideDuration={4000}
                onClose={() => setFeedback(null)}
            >
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Container>
    )
}
