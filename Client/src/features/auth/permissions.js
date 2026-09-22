import {roles, permisiions} from "../../consts"
import _ from "lodash" 

const defaultPermisions = [permisiions.DASHBOARD, permisiions.INVENTORY]

function roleBasedPermissions(role) {
    switch (role) {
    case roles.CUSTOMER_ADMIN:
        return [permisiions.USER_MANAGEMENT, permisiions.SITE_MANAGEMENT, permisiions.TICKETS]
    case roles.SCLOUDX_ADMIN:
        return [permisiions.USER_MANAGEMENT, permisiions.CUSTOMER_MANAGEMENT, permisiions.SITE_MANAGEMENT, permisiions.VENDOR_MANAGEMENT, permisiions.TICKETS, permisiions.SALES_OPPORTUNITIES, permisiions.DELIVERY_ORDERS]
    case roles.CUSTOMER_USER:
        return [permisiions.SITE_MANAGEMENT, permisiions.TICKETS]
    case roles.SCLOUDX_USER:
        return [permisiions.USER_MANAGEMENT, permisiions.CUSTOMER_MANAGEMENT, permisiions.SITE_MANAGEMENT, permisiions.VENDOR_MANAGEMENT, permisiions.TICKETS]
    case roles.VENDOR_ADMIN:
        return [permisiions.USER_MANAGEMENT]
    case roles.VENDOR_USER:
        return []
    case roles.SCLOUDX_SALES_ADMIN:
        return [permisiions.USER_MANAGEMENT, permisiions.SALES_OPPORTUNITIES, permisiions.VENDOR_MANAGEMENT]
    case roles.SCLOUDX_SALES_USER:
        return [permisiions.SALES_OPPORTUNITIES]
    case roles.SCLOUDX_SERVICE_DELIVERY:
        return [permisiions.CUSTOMER_MANAGEMENT, permisiions.SITE_MANAGEMENT, permisiions.INVENTORY, permisiions.DELIVERY_ORDERS, permisiions.VENDOR_MANAGEMENT]
    // SCX Management's own side menu, on top of its Dashboard (which already
    // rolls up Sales/Finance/Delivery/NOC as tabs - see ManagementDashboard):
    // read-only Customer/Site/Vendor Management, Sales Opportunities and
    // Tickets. Every page here already hides its create/edit/delete
    // controls unless the viewer's role is an exact match (SCX Admin, SCX
    // Sales Admin, etc.) - Management is neither, so it gets a view-only
    // page for free ("Add vendor Management to Management Role - read
    // only").
    case roles.SCLOUDX_MANAGEMENT:
        return [permisiions.CUSTOMER_MANAGEMENT, permisiions.SITE_MANAGEMENT, permisiions.VENDOR_MANAGEMENT, permisiions.SALES_OPPORTUNITIES, permisiions.TICKETS, permisiions.DELIVERY_ORDERS]
    default:
        return []
    }
}

export default function getPermissions(role) {
    return _.union(roleBasedPermissions(role), defaultPermisions)
}   
