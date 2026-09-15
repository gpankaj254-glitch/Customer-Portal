export const loginPageStatusVals = {
    idle : "idle", 
    loading: "loading"
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
