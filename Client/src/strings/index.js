import { sideMenuItems, roles } from "../consts"

export function sideMenuItemNames (sideMenuItem) {
    switch (sideMenuItem) {
    case sideMenuItems.DASHBOARD:
        return "Dashboard"
    case sideMenuItems.INVENTORY:
        return "Inventory Management"
    case sideMenuItems.BILLING:
        return "Billing"
    case sideMenuItems.TICKETS:
        return "Tickets"
    case sideMenuItems.USER_MANAGEMENT:
        return "User Management"
    case sideMenuItems.CUSTOMER_MANAGEMENT:
        return "Customer Management"
    case sideMenuItems.SITE_MANAGEMENT:
        return "Site Management"
    case sideMenuItems.VENDOR_MANAGEMENT:
        return "Vendor Management"
    case sideMenuItems.SALES_OPPORTUNITIES:
        return "Sales Opportunities"
    case sideMenuItems.DELIVERY_ORDERS:
        return "Service Delivery Management"
    case sideMenuItems.PRODUCT_MANAGEMENT:
        return "Product Management"
    default:
        return sideMenuItem
    }
}

export function roleNames (role) {
    switch (role) {
    case roles.CUSTOMER_ADMIN:
        return "Customer Admin"
    case roles.CUSTOMER_USER:
        return "Customer User"
    case roles.SCLOUDX_ADMIN:
        return "Scloudx Admin"
    case roles.SCLOUDX_USER:
        return "SCX NOC"
    case roles.VENDOR_ADMIN:
        return "Vendor Admin"
    case roles.VENDOR_USER:
        return "Vendor User"
    case roles.SCLOUDX_SALES_ADMIN:
        return "SCX Sales Admin"
    case roles.SCLOUDX_SALES_USER:
        return "SCX Sales"
    case roles.SCLOUDX_FINANCE:
        return "SCX Finance"
    case roles.SCLOUDX_SERVICE_DELIVERY:
        return "SCX Service Delivery"
    case roles.SCLOUDX_MANAGEMENT:
        return "SCX Management"
    default:
        return role
    }
}

// export function roleListForCustomerUser (role) {
//     switch (role) {
//     case roles.CUSTOMER_ADMIN:
//         return "Admin"     
//     case roles.CUSTOMER_USER:
//         return "Customer User"
//     case roles.SCLOUDX_ADMIN:
//         return "Scloudx Admin"     
//     case roles.SCLOUDX_USER:
//         return "Scloudx User"
//     default: 
//         return role    
//     }
// }