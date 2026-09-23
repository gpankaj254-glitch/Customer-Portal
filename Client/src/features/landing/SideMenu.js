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
import { selecPermissions, selectUser } from "../auth/authSlice"
import {selectPage, togglePage} from "./landingSlice"
import {sideMenuItems, roles} from "../../consts"
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

// SCX Management's own explicit order, everything below Dashboard - "Sales
// Management, Service Delivery Management, NOC Management, Customer
// Management, Site Management, Inventory Management, Vendor Management
// (read-only)" - Tickets moves out of the top mainListItems section (see
// managementMainListItems below) into its place here, under its
// Management-only name (see RENAMED_ROLE_LABEL_OVERRIDES). Every other role
// is unaffected - this only replaces the list used when the signed-in role
// is SCX Management.
const managementMainListItems = [sideMenuItems.DASHBOARD]
const managementSecondaryListItems = [
    sideMenuItems.SALES_OPPORTUNITIES,
    sideMenuItems.DELIVERY_ORDERS,
    sideMenuItems.TICKETS,
    sideMenuItems.CUSTOMER_MANAGEMENT,
    sideMenuItems.SITE_MANAGEMENT,
    sideMenuItems.INVENTORY,
    sideMenuItems.VENDOR_MANAGEMENT,
]

// SCX Admin's own explicit order - "Replicate like SCX Management Role":
// same treatment (Tickets/Sales Opportunities renamed and moved out of the
// top mainListItems section), but with Admin's fuller permission set
// (User Management, Vendor Management) included in the order too.
const adminMainListItems = [sideMenuItems.DASHBOARD]
const adminSecondaryListItems = [
    sideMenuItems.CUSTOMER_MANAGEMENT,
    sideMenuItems.USER_MANAGEMENT,
    sideMenuItems.SITE_MANAGEMENT,
    sideMenuItems.INVENTORY,
    sideMenuItems.VENDOR_MANAGEMENT,
    sideMenuItems.TICKETS,
    sideMenuItems.DELIVERY_ORDERS,
    sideMenuItems.SALES_OPPORTUNITIES,
]

// SCX Sales Admin/Sales User's own explicit order - "Put Sales management
// below Dashboard" - Sales Opportunities moves out of the generic
// secondaryListItems' order (where it trailed last) to lead this list,
// right under Dashboard, for these two roles specifically.
const salesMainListItems = [sideMenuItems.DASHBOARD]
const salesSecondaryListItems = [
    sideMenuItems.SALES_OPPORTUNITIES,
    sideMenuItems.USER_MANAGEMENT,
    sideMenuItems.VENDOR_MANAGEMENT,
    sideMenuItems.DELIVERY_ORDERS,
    sideMenuItems.CUSTOMER_MANAGEMENT,
    sideMenuItems.SITE_MANAGEMENT,
    sideMenuItems.INVENTORY,
]

// SCX Admin and SCX Management both see these two items under different
// names - every other role keeps the default name from strings/index.js's
// sideMenuItemNames.
const RENAMED_ROLE_LABEL_OVERRIDES = {
    [sideMenuItems.SALES_OPPORTUNITIES]: "Sales Management",
    [sideMenuItems.TICKETS]: "NOC Management",
}

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
    const currentUser = useSelector(selectUser)
    const isManagement = currentUser.role === roles.SCLOUDX_MANAGEMENT
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN
    const isSales = currentUser.role === roles.SCLOUDX_SALES_ADMIN || currentUser.role === roles.SCLOUDX_SALES_USER
    const isRenamedRole = isManagement || isAdmin
    const effectiveMainListItems = isManagement ? managementMainListItems : isAdmin ? adminMainListItems : isSales ? salesMainListItems : mainListItems
    const effectiveSecondaryListItems = isManagement ? managementSecondaryListItems : isAdmin ? adminSecondaryListItems : isSales ? salesSecondaryListItems : secondaryListItems
    const getLabel = (item) => (isRenamedRole && RENAMED_ROLE_LABEL_OVERRIDES[item]) || sideMenuItemNames(item)

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
                        {effectiveMainListItems.map((item) => (
                            _.includes(permissions, item) && (<ListItemButton key = {item} selected = {page === item} onClick = {(event) => handleToggle(event, item)}>
                                <ListItemIcon>
                                    {getMenuItemIcon(item)}
                                </ListItemIcon>
                                <Typography variant="h4">{getLabel(item)}
                                </Typography>
                                {/* <ListItemText primary={getLabel(item)} /> */}
                            </ListItemButton>)
                        ))}
                        <Divider sx={{ my: 1 }} />
                        {effectiveSecondaryListItems.map((item) => (
                            _.includes(permissions, item) && (<ListItemButton key = {item} selected = {page === item} onClick = {(event) => handleToggle(event, item)}>
                                <ListItemIcon>
                                    {getMenuItemIcon(item)}
                                </ListItemIcon>
                                <Box overflow="inherit">
                                    <Typography variant="h4">{getLabel(item)}
                                    </Typography>
                                </Box>

                                {/* <ListItemText primary={getLabel(item)} variant="h4" /> */}
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