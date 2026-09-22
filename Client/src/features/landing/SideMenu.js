import * as React from "react"
import { styled } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import MuiDrawer from "@mui/material/Drawer"
import Box from "@mui/material/Box"
import Toolbar from "@mui/material/Toolbar"
import List from "@mui/material/List"
import Divider from "@mui/material/Divider"
import IconButton from "@mui/material/IconButton"
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
// import ListItemText from "@mui/material/ListItemText"
import Typography from "@mui/material/Typography"

import { useSelector, useDispatch } from "react-redux"
import { selecPermissions } from "../auth/authSlice" 
import {selectPage, togglePage} from "./landingSlice"
import {sideMenuItems} from "../../consts"
import { sideMenuItemNames } from "../../strings"
import getMenuItemIcon from "./SideMenuIcon"
// import { getUsers } from "../users/userSlice"

import _ from "lodash"
import PropTypes from "prop-types"

const drawerWidth = 240

const mainListItems = [sideMenuItems.DASHBOARD, sideMenuItems.TICKETS ]

// DELIVERY_ORDERS ("Service Delivery Management") is listed first - only SCX
// Service Delivery currently has this permission (see permissions.js), so
// this puts it right below Dashboard for that role, above every other item
// here. Everyone else's list is unaffected since they don't have it at all.
const secondaryListItems = [sideMenuItems.DELIVERY_ORDERS, sideMenuItems.CUSTOMER_MANAGEMENT, sideMenuItems.USER_MANAGEMENT, sideMenuItems.SITE_MANAGEMENT, sideMenuItems.INVENTORY, sideMenuItems.VENDOR_MANAGEMENT, sideMenuItems.SALES_OPPORTUNITIES]

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== "open" })(
    ({ theme, open }) => ({
        "& .MuiDrawer-paper": {
            position: "relative",
            width: drawerWidth,
            transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
            boxSizing: "border-box",
            ...(!open && {
                overflowX: "hidden",
                transition: theme.transitions.create("width", {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                }),
                width: theme.spacing(7),
                [theme.breakpoints.up("sm")]: {
                    width: theme.spacing(9),
                },
            }),
        },
    }),
)

export default function SideMenu(props) {

    const dispatch = useDispatch()

    const handleToggle = (event, item) => {
        console.log("handle toggle")
        dispatch(togglePage(item))
        console.log(item)
        // if(item === sideMenuItems.USER_MANAGEMENT){
        // 	console.log("Get users")
        // 	dispatch(getUsers())
        // }
    }

    const page = useSelector(selectPage)
    const permissions = useSelector(selecPermissions)

    // const [open, setOpen] = React.useState(true)
    // const toggleDrawer = () => {
    // 	setOpen(!open)
    // }

    return (
        <Box sx={{ display: "flex", whiteSpace: "break-spaces"}}>
            <CssBaseline />
            <Drawer variant="permanent" open={props.open}>
          
                <Toolbar
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        px: [1],
                    }}
                >
                    <IconButton onClick={props.toggleDrawer}>
                        <ChevronLeftIcon />
                    </IconButton>
                </Toolbar>
          
                <Divider />

                <List component="nav">
                    <React.Fragment>
                        {mainListItems.map((item) => (
                            _.includes(permissions, item) && (<ListItemButton key = {item} selected = {page === item} onClick = {(event) => handleToggle(event, item)}>
                                <ListItemIcon>
                                    {getMenuItemIcon(item)}
                                </ListItemIcon>
                                <Typography variant="h4">{sideMenuItemNames(item)}
                                </Typography>
                                {/* <ListItemText primary={sideMenuItemNames(item)} /> */}
                            </ListItemButton>)
                        ))}
                        <Divider sx={{ my: 1 }} />
                        {secondaryListItems.map((item) => (
                            _.includes(permissions, item) && (<ListItemButton key = {item} selected = {page === item} onClick = {(event) => handleToggle(event, item)}>
                                <ListItemIcon>
                                    {getMenuItemIcon(item)}
                                </ListItemIcon>
                                <Box overflow="inherit">
                                    <Typography variant="h4">{sideMenuItemNames(item)}
                                    </Typography>
                                </Box>
                                
                                {/* <ListItemText primary={sideMenuItemNames(item)} variant="h4" /> */}
                            </ListItemButton>
                            )
                        ))}
                    </React.Fragment>
                </List>

            </Drawer>
        </Box>
    )
}

SideMenu.propTypes = {
    toggleDrawer: PropTypes.func,
    open: PropTypes.bool
}