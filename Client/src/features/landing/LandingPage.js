/* eslint-disable no-unused-vars */
import * as React from "react"
import { styled } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import Box from "@mui/material/Box"
import MuiAppBar from "@mui/material/AppBar"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import IconButton from "@mui/material/IconButton"
import Badge from "@mui/material/Badge"
import MenuIcon from "@mui/icons-material/Menu"
import NotificationsIcon from "@mui/icons-material/Notifications"

import LongMenu from "./LongMenu"

import getPage from "./pages"
import {selectPage} from "./landingSlice"
import { useSelector } from "react-redux"
import SideMenu from "./SideMenu"
import { sideMenuItemNames, roleNames } from "../../strings"
import { selectUser } from "../auth/authSlice"

const drawerWidth = 240

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}))

function LandingPageContent() {
    const [open, setOpen] = React.useState(true)
    const toggleDrawer = () => {
        setOpen(!open)
    }

    const page = useSelector(selectPage)
    const user = useSelector(selectUser)

    return (
        <Box sx={{ display: "flex" }}>
            <CssBaseline />
            <AppBar position="absolute" open={open}>
                <Toolbar
                    sx={{
                        pr: "24px", // keep right padding when drawer closed
                    }}
                >
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="open drawer"
                        onClick={toggleDrawer}
                        sx={{
                            marginRight: "36px",
                            ...(open && { display: "none" }),
                        }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography
                        component="h1"
                        variant="h1"
                        color="inherit"
                        noWrap
                        sx={{ flexGrow: 1 }}
                    >
                        {sideMenuItemNames(page)}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="inherit"
                        noWrap
                        sx={{ mr: 2 }}
                    >
                        {user.name} logged in as {roleNames(user.role)}
                    </Typography>
                    <IconButton color="inherit">
                        <Badge badgeContent={0} color="secondary">
                            <NotificationsIcon />
                        </Badge>
                    </IconButton>
                    <LongMenu></LongMenu>
                </Toolbar>
            </AppBar>
            <SideMenu toggleDrawer = {toggleDrawer} open={open} />

            <Box
                component="main"
                sx={{
                //     backgroundColor: (theme) =>
                //         theme.palette.mode === "light"
                //             ? theme.palette.grey[100]
                //             : theme.palette.grey[900],
                    flexGrow: 1,
                    height: "100vh",
                    overflow: "auto",
                }}
            >
                <Toolbar />
                {getPage(page)}
            </Box>
        </Box>
    )
}

export default function LandingPage() {
    return <LandingPageContent />
}
