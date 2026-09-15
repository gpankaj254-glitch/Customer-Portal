import { createResponseErrorMessage } from "../../utils/responseHandlers"
import axios from "axios"
import { baseURL, headers } from "../../utils/axios"

export async function fetchGetOpportunities(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/opportunity/get?limit=${data.limit}&page=${data.page}&sortBy=createdAt:desc`, { search: data.search || "" }, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchCreateOpportunity(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/opportunity/create`, [data], { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchUpdateOpportunity(data, rejectWithValue) {
    try {
        const { opportunityId, ...updateBody } = data
        const response = await axios.patch(`${baseURL}/opportunity/${opportunityId}`, updateBody, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeactivateOpportunity(opportunityId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/opportunity/${opportunityId}`, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeletedOpportunities(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/opportunity/deleted?limit=${data.limit}&page=${data.page}`, {}, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchRestoreOpportunity(opportunityId, rejectWithValue) {
    try {
        const response = await axios.patch(`${baseURL}/opportunity/${opportunityId}/restore`, {}, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchPermanentlyDeleteOpportunity(opportunityId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/opportunity/${opportunityId}/permanent`, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}
