export function createResponseErrorMessage (error) {
    if (error.response && error.response.data && error.response.data.message) {
        return error.response.data.message
    } else if (error.message){
        return error.message
    } else {
        return "An unknown error has occured"
    }
}