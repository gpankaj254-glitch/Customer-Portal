
import * as React from "react"
import Button from "@mui/material/Button"
import CssBaseline from "@mui/material/CssBaseline"
import TextField from "@mui/material/TextField"
import Grid from "@mui/material/Grid"
// import FormGroup from "@mui/material/FormGroup"
// import FormControlLabel from "@mui/material/FormControlLabel"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Container from "@mui/material/Container"
import { Alert } from "@mui/material"

// import Switch from "@mui/material/Switch"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import FormControl from "@mui/material/FormControl"
import Select from "@mui/material/Select"
import { createUser} from "./userSlice"
import PasswordField from "../../components/PasswordField"

import { useSelector, useDispatch } from "react-redux"
import { selectCustomerList, selectGetCustomersError } from "../customers/customerSlice"
import { selectVendorList } from "../vendors/vendorSlice"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { roleNames } from "../../strings"
import Snackbar from "@mui/material/Snackbar"

const baseRoleList = [
    roles.CUSTOMER_ADMIN,
    roles.CUSTOMER_USER,
    roles.VENDOR_ADMIN,
    roles.VENDOR_USER,
    roles.SCLOUDX_USER,
    roles.SCLOUDX_SALES_USER,
    roles.SCLOUDX_FINANCE,
    roles.SCLOUDX_SERVICE_DELIVERY,
    roles.SCLOUDX_MANAGEMENT,
]

export default function CreateUser() {
    const [selectedCustomer, setSelectedCustomer] = React.useState("")
    const [selectedVendor, setSelectedVendor] = React.useState("")
    const [selectedRole, setSelectedRole] = React.useState("")
    // const [scloudxUser, setScloudxUser] = React.useState(false)
    const errorMessage = useSelector(selectGetCustomersError)
    const [feedback, setFeedback] = React.useState(null)

    const user = useSelector(selectUser)

    const dispatch = useDispatch()

    const handleCustomerChange = (event) => {
        console.log(event.target)
        setSelectedCustomer(event.target.value)
    }

    const handleVendorChange = (event) => {
        setSelectedVendor(event.target.value)
    }

    const handleRoleChange = (event) => {
        console.log(event.target)
        setSelectedRole(event.target.value)
    }

    const customerList = useSelector(selectCustomerList)
    const vendorList = useSelector(selectVendorList)

    const roleList = user.role === roles.SCLOUDX_ADMIN
        ? [...baseRoleList, roles.SCLOUDX_ADMIN, roles.SCLOUDX_SALES_ADMIN]
        : baseRoleList

    const handleSubmit = async (event) => {
    event.preventDefault()

    const role = (user.role === roles.CUSTOMER_ADMIN) ? roles.CUSTOMER_USER
        : (user.role === roles.VENDOR_ADMIN) ? roles.VENDOR_USER
            : (user.role === roles.SCLOUDX_SALES_ADMIN) ? roles.SCLOUDX_SALES_USER
                : selectedRole
    const customerId = (user.role === roles.CUSTOMER_ADMIN) ? user.customer.id : selectedCustomer
    const vendorId = (user.role === roles.VENDOR_ADMIN) ? user.vendor.id : selectedVendor

    const form = event.currentTarget
    const data = new FormData(form)
    const payload = {
        email: data.get("email"),
        password: data.get("password"),
        name: data.get("userName"),
        description: data.get("description"),
        customerId,
        vendorId,
        role
    }

    try {
        await dispatch(createUser([payload])).unwrap()
        setFeedback({ severity: "success", message: "User created successfully" })
        form.reset()
        setSelectedCustomer("")
        setSelectedVendor("")
        setSelectedRole("")
    } catch (err) {
        setFeedback({ severity: "error", message: err || "Failed to create user" })
    }
}

    // const [open, setOpen] = React.useState(false)
    if (errorMessage) {
        return <Alert severity="error">{errorMessage}</Alert>
    }
    else {
        return (
            <Container component="main" maxWidth="md">
                <CssBaseline />
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >

                    <Typography component="h1" variant="h1">

            Create New User
                    </Typography>

                    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
                        <Grid container spacing={2}>
                            {(user.role === roles.SCLOUDX_ADMIN || user.role === roles.SCLOUDX_USER) && (
                                <Grid item xs={12} sm={12}>
                                    <FormControl fullWidth>
                                        <InputLabel id="role-select-label">Role</InputLabel>
                                        <Select
                                            labelId="role-select-label"
                                            id="role"
                                            value={selectedRole}
                                            label="Role"
                                            onChange={handleRoleChange}
                                            // disabled = {scloudxUser}
                                        >{roleList.map((item, index) => (
                                                <MenuItem
                                                    key={index}
                                                    value={item}
                                                >
                                                    {roleNames(item)}
                                                </MenuItem>
                                            ))} 
                                        </Select>
                                    </FormControl>
                                </Grid> )}
                                
                            {(selectedRole === roles.CUSTOMER_ADMIN || selectedRole === roles.CUSTOMER_USER) && (
                                <Grid item xs={12} sm={12}>
                                    <FormControl fullWidth>
                                        <InputLabel id="customer-select-label">Customer</InputLabel>
                                        <Select
                                            labelId="customer-select-label"
                                            id="customer"
                                            value={selectedCustomer}
                                            label="Customer"
                                            onChange={handleCustomerChange}
                                            // disabled = {scloudxUser}
                                        >{customerList.map((row) => (
                                                <MenuItem
                                                    key={row.id}
                                                    value={row.id}
                                                    // align="left"
                                                    // style={{ minWidth: column.minWidth }}
                                                >
                                                    {row.name}
                                                </MenuItem>
                                            ))} 
                                        </Select>
                                    </FormControl>
                                </Grid> )}

                            {(selectedRole === roles.VENDOR_ADMIN || selectedRole === roles.VENDOR_USER) && (
                                <Grid item xs={12} sm={12}>
                                    <FormControl fullWidth>
                                        <InputLabel id="vendor-select-label">Vendor</InputLabel>
                                        <Select
                                            labelId="vendor-select-label"
                                            id="vendor"
                                            value={selectedVendor}
                                            label="Vendor"
                                            onChange={handleVendorChange}
                                        >{vendorList.map((row) => (
                                                <MenuItem
                                                    key={row.id}
                                                    value={row.id}
                                                >
                                                    {row.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid> )}

                            <Grid item xs={12}>
                                <TextField
                                    autoComplete="given-name"
                                    name="userName"
                                    required
                                    fullWidth
                                    id="userName"
                                    label="Name"
                                    autoFocus
                                />
				
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    required
                                    fullWidth
                                    id="email"
                                    label="Email Address"
                                    name="email"
                                    autoComplete="email"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <PasswordField
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    id="password"
                                    autoComplete="new-password"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    name="description"
                                    label="Description"
                                    id="description"
                                />
                            </Grid>
                            <Grid item xs={12} sm={12}>

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 3, mb: 2 }}
                                >
              Create User
                                </Button>
                            </Grid>

                        </Grid>

                    </Box>
                    {/* </Collapse> */}
                </Box>
		<Snackbar
   		 open={!!feedback}
    		autoHideDuration={4000}
    		onClose={() => setFeedback(null)}
		>
    		{feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
		</Snackbar>
            </Container>
        )}
}