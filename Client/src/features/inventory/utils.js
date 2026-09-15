import _ from "lodash"
export const pageStatusVals = {
    idle : "idle", 
    loading: "loading",
    fetched: "fetched", 
    error: "error"
}

export const errorMessages = {
    unauthorised: "Please check your email id and password", 
    error: "error"
}

export function getErrorMessage(payload){
    console.log(payload)
    if (payload && payload.data && payload.data.code) {
        switch (payload.response.data.code) {
        case "401": 
            return errorMessages.unauthorised
        default:
            return errorMessages.error
        }
    }
    return errorMessages.error
}

export function createInventory(payload){ 
    const inventory = _.pick(payload, ["name", "_id", "customer", "region", "customerSiteIdentifier", "contactList", "circuitList", "location"])
    // inventory.circuitCount =  _.get(payload, "circuitList").length
    return inventory
}
