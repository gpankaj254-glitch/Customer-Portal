
import React from "react"

import DashboardIcon from "@mui/icons-material/Dashboard"
import PeopleIcon from "@mui/icons-material/People"
import LayersIcon from "@mui/icons-material/Layers"
import InventoryIcon from "@mui/icons-material/Inventory"
import ReportProblemIcon from "@mui/icons-material/ReportProblem"
import ReceiptIcon from "@mui/icons-material/Receipt"
import LocationOnIcon from "@mui/icons-material/LocationOn"
import LocalShippingIcon from "@mui/icons-material/LocalShipping"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import AssignmentIcon from "@mui/icons-material/Assignment"
import CategoryIcon from "@mui/icons-material/Category"

import {sideMenuItems} from "../../consts"

export default function getMenuItemIcon(itemType) {
    switch (itemType) {
    case sideMenuItems.DASHBOARD:
        return <DashboardIcon />
    case sideMenuItems.INVENTORY:
        return <InventoryIcon />
    case sideMenuItems.TICKETS:
        return <ReportProblemIcon />
    case sideMenuItems.BILLING:
        return <ReceiptIcon />
    case sideMenuItems.USER_MANAGEMENT:
        return <PeopleIcon />
    case sideMenuItems.CUSTOMER_MANAGEMENT:
        return <PeopleIcon />
    case sideMenuItems.SITE_MANAGEMENT:
        return <LocationOnIcon />
    case sideMenuItems.VENDOR_MANAGEMENT:
        return <LocalShippingIcon />
    case sideMenuItems.SALES_OPPORTUNITIES:
        return <TrendingUpIcon />
    case sideMenuItems.DELIVERY_ORDERS:
        return <AssignmentIcon />
    case sideMenuItems.PRODUCT_MANAGEMENT:
        return <CategoryIcon />
    default:
        return <LayersIcon />
    }
}