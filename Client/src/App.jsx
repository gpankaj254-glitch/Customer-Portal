/* eslint-disable no-unused-vars */
import React from "react"
import "@fontsource/roboto/300.css"
import "@fontsource/roboto/400.css"
import "@fontsource/roboto/500.css"
import "@fontsource/roboto/700.css"

import Login from "./features/auth/Login"
// import Dashboard from './features/dashboard/Dashboard'
import LandingPage from "./features/landing/LandingPage"
import ResetPasswordPage from "./features/auth/ResetPasswordPage"

import "./App.css"
import { createTheme, ThemeProvider, experimental_sx as sx,
} from "@mui/material/styles"
// import { blue, pink } from "@mui/material/colors"

import { useSelector } from "react-redux"
import {selecIsUserLoggedIn } from "./features/auth/authSlice"

const theme = createTheme({
    palette: {
        type: "dark",
        primary: {
            main: "#3f51b5",
        },
        secondary: {
            main: "#f50057",
        },
    },
    typography: {
        fontFamily: "Roboto",
        h6: {
            fontSize: "1.2rem",
            fontWeight: 600,
            letterSpacing: "0.09em",
            fontVariantCaps: "all-small-caps"
        },
        h1: {
            fontSize: "1.5rem",
            fontWeight: 400,
            fontVariantCaps: "titling-caps",
        },
        h3: {
            fontSize: "7rem",
            fontWeight: 100,
            fontVariantCaps: "titling-caps",
        },
        h5: {
            fontSize: "1rem",
            fontWeight: 500,
            fontVariantCaps: "all-small-caps"
        },
        h2: {
            fontSize: "1.3rem",
            fontWeight: 400,
            fontVariantCaps: "all-small-caps"
        },
        h4: {
            fontSize: "1rem",
            fontWeight: "normal",
            fontVariantCaps: "titling-caps",
        },
        body2: {

        },
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: sx ({
                    p: "0.5rem"
                })
            }
           
        }
    }
    
})

function App () {
    const isUserLoggedIn = useSelector(selecIsUserLoggedIn)

    function pageSelector () {
        // This app has no client-side router - the only URL this frontend
        // needs to handle outside the logged-in/logged-out split is the
        // password-reset link emailed to users, so it's checked directly
        // off the browser URL rather than pulling in a routing library.
        if (window.location.pathname === "/reset-password") {
            const token = new URLSearchParams(window.location.search).get("token")
            return <ResetPasswordPage token={token} />
        }
        if (isUserLoggedIn) {
            return <LandingPage />
        } else {
            return <Login />
        }
    }
    return (
        <div>
            <ThemeProvider theme={theme}>
                {pageSelector()} 
            </ThemeProvider>
        </div>
    )
}

export default App
