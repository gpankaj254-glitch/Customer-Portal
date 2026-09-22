import React from "react"

import {pages} from "../../consts"
import Dashboard from "../dashboard/Dashboard"
import Users from "../users/Users"
import Customers from "../customers/Customers"
import Sites from "../sites/Sites"
import Vendors from "../vendors/Vendors"
import Inventory from "../inventory/Inventory"
import Tickets from "../tickets/Tickets"
import Opportunities from "../opportunities/Opportunities"
import DeliveryOrders from "../delivery/DeliveryOrders"

export default function getPage(page) {
    switch(page) {
    case pages.SALES_OPPORTUNITIES:
        return <Opportunities />
    case pages.DELIVERY_ORDERS:
        return <DeliveryOrders />
    case pages.USER_MANAGEMENT:
        return <Users />
    case pages.CUSTOMER_MANAGEMENT:
        return <Customers />
    case pages.SITE_MANAGEMENT:
        return <Sites />
    case pages.VENDOR_MANAGEMENT:
        return <Vendors />
    case pages.INVENTORY:
        return <Inventory />
    case pages.TICKETS:
        return <Tickets />
    default:
        return <Dashboard />
    }
}