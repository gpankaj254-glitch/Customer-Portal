import React from "react"

import Avatar from "@mui/material/Avatar"
// import Button from '@mui/material/Button'
import {LoadingButton} from "@mui/lab"
import CssBaseline from "@mui/material/CssBaseline"
import TextField from "@mui/material/TextField"

import Link from "@mui/material/Link"
import Paper from "@mui/material/Paper"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import LockOutlinedIcon from "@mui/icons-material/LockOutlined"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"

import { useSelector, useDispatch } from "react-redux"
import { login, selectLoginError } from "./authSlice"
import ForgotPasswordDialog from "./ForgotPasswordDialog"

// const theme = createTheme()

export default function Login () {
    const errorMessage = useSelector(selectLoginError)
    const dispatch = useDispatch()
    const [forgotPasswordOpen, setForgotPasswordOpen] = React.useState(false)
    // const [loginError, setloginError] = useState(errorMessage)

    const handleSubmit = (event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        console.log(data)

        const payload = {
            email: data.get("email"),
            password: data.get("password")
        }
        dispatch(login(payload))
    }

    function errorAlertCreator() {
        if (errorMessage) {
            return <Alert severity="error">{errorMessage}</Alert>
        } else {
            return <></>
        }
    }

    return (
        <Grid container component="main" sx={{ height: "100vh" }}>
            <CssBaseline />
            <Grid
                item
                xs={false}
                sm={4}
                md={7}
                sx={{
                    // backgroundImage: "url(https://source.unsplash.com/random)",
                    // backgroundRepeat: "no-repeat",
                    backgroundColor: (t) => (t.palette.mode ===
              "light"
                        ? t.palette.grey[50]
                        : t.palette.grey[900]),
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                }}
            />
            <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
                <Box
                    sx={{
                        my: 8,
                        mx: 4,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center"
                    }}
                >
                    <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
                        <LockOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
              SIGN IN
                    </Typography>
                    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                        />
                        {/* <FormControlLabel
                            control={<Checkbox value="remember" color="primary" />}
                            label="Remember me"
                        /> */}
                        <LoadingButton
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                        >
                Sign In
                        </LoadingButton>
                        {errorAlertCreator()}
                        <Grid container>
                            <Grid item xs>
                                <Link
                                    href="#"
                                    variant="body2"
                                    onClick={(event) => {
                                        event.preventDefault()
                                        setForgotPasswordOpen(true)
                                    }}
                                >
                  Forgot password?
                                </Link>
                            </Grid>
                        </Grid>
                    </Box>
                </Box>
            </Grid>
            <ForgotPasswordDialog open={forgotPasswordOpen} onClose={() => setForgotPasswordOpen(false)} />
        </Grid>
    )
}
