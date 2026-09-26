import axios from "axios"
import { baseURL, headers } from "../../utils/axios"
import { createResponseErrorMessage } from "../../utils/responseHandlers"

// "Create Product Management Function for SCX Admin" - one shared API for
// both Product and Bandwidth (see circuitOption.route.js), distinguished by
// `type`.

export async function fetchCircuitOptionNames(type, rejectWithValue) {
    try {
        const response = await axios.get(`${baseURL}/circuit-option/get?type=${type}`, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchManagedCircuitOptions(type, rejectWithValue) {
    try {
        const response = await axios.get(`${baseURL}/circuit-option/managed?type=${type}`, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchCreateCircuitOption(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/circuit-option/create`, data, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchRenameCircuitOption(id, name, rejectWithValue) {
    try {
        const response = await axios.patch(`${baseURL}/circuit-option/${id}/rename`, { name }, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeactivateCircuitOption(id, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/circuit-option/${id}`, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}
