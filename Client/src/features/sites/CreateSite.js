import * as React from "react"
import Button from "@mui/material/Button"
import CssBaseline from "@mui/material/CssBaseline"
import TextField from "@mui/material/TextField"
import Grid from "@mui/material/Grid"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Container from "@mui/material/Container"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import FormControl from "@mui/material/FormControl"
import Select from "@mui/material/Select"
import Autocomplete from "@mui/material/Autocomplete"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import { useDispatch, useSelector } from "react-redux"
import { createSite, getSites, selectPagination, selectSearch } from "./siteSlice"
import { selectCustomerList } from "../customers/customerSlice"
import { countryOptions } from "../../consts/countryOptions"

export default function CreateSite() {
    const dispatch = useDispatch()
    const customerList = useSelector(selectCustomerList)
    const pagination = useSelector(selectPagination)
    const search = useSelector(selectSearch)
    const [selectedCustomer, setSelectedCustomer] = React.useState("")
    const [country, setCountry] = React.useState("")
    const [feedback, setFeedback] = React.useState(null)

    const handleCustomerChange = (event) => {
        setSelectedCustomer(event.target.value)
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)

        const customer = customerList.find((c) => c.id === selectedCustomer)
        if (!customer) {
            setFeedback({ severity: "error", message: "Please select a customer" })
            return
        }

        // regionId is intentionally omitted here: the backend resolves the
        // customer's default region server-side (createSite -> customerId ->
        // customer.defaultRegion), so the client doesn't need to know about
        // regions at all for this form.
        const payload = {
            name: data.get("siteName"),
            customerId: customer.id,
            address: data.get("address"),
            postalCode: data.get("postalCode"),
            town: data.get("town"),
            country,
            endUser: data.get("endUser"),
        }

        try {
            await dispatch(createSite(payload)).unwrap()
            setFeedback({ severity: "success", message: "Site created successfully" })
            form.reset()
            setSelectedCustomer("")
            setCountry("")
            // page + 1: pagination.page is 0-indexed (matches MUI's
            // TablePagination), the backend is 1-indexed. search is included
            // so the refreshed list respects whatever filter is active.
            dispatch(getSites({ limit: pagination.limit, page: pagination.page + 1, search }))
        } catch (err) {
            setFeedback({ severity: "error", message: err || "Failed to create site" })
        }
    }

    return (
        <Container component="main" maxWidth="md">
            <CssBaseline />
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography component="h1" variant="h5">Create New Site</Typography>

                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <Grid container spacing={2} justifyContent="center">
                        <Grid item xs={12} sm={12}>
                            <FormControl fullWidth>
                                <InputLabel id="customer-select-label">Customer</InputLabel>
                                <Select
                                    labelId="customer-select-label"
                                    id="customer"
                                    value={selectedCustomer}
                                    label="Customer"
                                    onChange={handleCustomerChange}
                                >
                                    {customerList.map((row) => (
                                        <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField required fullWidth name="siteName" label="Site Name" autoFocus />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth name="endUser" label="End User" />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth name="address" label="Address" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth name="town" label="Town" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth name="postalCode" label="Postal Code" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                fullWidth
                                options={countryOptions}
                                value={country || null}
                                onChange={(event, newValue) => setCountry(newValue || "")}
                                renderInput={(params) => <TextField {...params} label="Country" />}
                            />
                        </Grid>

                        <Grid item xs={12} sm={12}>
                            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                                Create Site
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Box>

            <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(null)}>
                {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            </Snackbar>
        </Container>
    )
}
