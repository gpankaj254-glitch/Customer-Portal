import {roles, permisiions} from "../../consts"
import _ from "lodash" 

const defaultPermisions = [permisiions.DASHBOARD, permisiions.INVENTORY]

function roleBasedPermissions(role) {
    switch (role) {
    case roles.CUSTOMER_ADMIN:
        return [permisiions.USER_MANAGEMENT, permisiions.SITE_MANAGEMENT, permisiions.TICKETS]
    case roles.SCLOUDX_ADMIN:
        return [permisiions.USER_MANAGEMENT, permisiions.CUSTOMER_MANAGEMENT, permisiions.SITE_MANAGEMENT, permisiions.VENDOR_MANAGEMENT, permisiions.TICKETS, permisiions.SALES_OPPORTUNITIES]
    case roles.CUSTOMER_USER:
        return [permisiions.SITE_MANAGEMENT, permisiions.TICKETS]
    case roles.SCLOUDX_USER:
        return [permisiions.USER_MANAGEMENT, permisiions.CUSTOMER_MANAGEMENT, permisiions.SITE_MANAGEMENT, permisiions.VENDOR_MANAGEMENT, permisiions.TICKETS, permisiions.SALES_OPPORTUNITIES]
    case roles.VENDOR_ADMIN:
        return [permisiions.USER_MANAGEMENT]
    case roles.VENDOR_USER:
        return []
    case roles.SCLOUDX_SALES_ADMIN:
        return [permisiions.USER_MANAGEMENT, permisiions.SALES_OPPORTUNITIES, permisiions.VENDOR_MANAGEMENT]
    case roles.SCLOUDX_SALES_USER:
        return [permisiions.SALES_OPPORTUNITIES]
    default:
        return []
    }
}

export default function getPermissions(role) {
    return _.union(roleBasedPermissions(role), defaultPermisions)
}   
