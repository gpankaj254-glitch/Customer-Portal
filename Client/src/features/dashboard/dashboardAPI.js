import axios from "axios"
import { baseURL, headers } from "../../utils/axios"
import { createResponseErrorMessage } from "../../utils/responseHandlers"

export async function fetchDashboardSummary (rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/dashboard/summary`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchOpenTicketsAnalysis (rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/dashboard/open-tickets-analysis`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

// The tickets closed within data.startDate..data.endDate (whole days) - the
// list behind a Closed Tickets tab. The server scopes it to the caller's own
// customer for Customer Admin/User.
export async function fetchClosedTicketsList (data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/dashboard/closed-tickets`, data, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchClosedTicketsAnalysis (data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/dashboard/closed-tickets-analysis`, data, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}
