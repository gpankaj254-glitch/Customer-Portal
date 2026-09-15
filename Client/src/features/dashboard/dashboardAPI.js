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

export async function fetchClosedTicketsAnalysis (data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/dashboard/closed-tickets-analysis`, data, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}
