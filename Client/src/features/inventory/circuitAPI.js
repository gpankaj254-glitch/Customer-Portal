import { createResponseErrorMessage } from "../../utils/responseHandlers"
import axios from "axios"
import { baseURL, headers } from "../../utils/axios"

export async function fetchCreateCircuit(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/circuit/create`, [data], {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchUpdateCircuit(data, rejectWithValue) {
    try {
        const { circuitId, ...updateBody } = data
        const response = await axios.patch(`${baseURL}/circuit/${circuitId}`, updateBody, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeactivateCircuit(circuitId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/circuit/${circuitId}`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeletedCircuits(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/circuit/deleted?limit=${data.limit}&page=${data.page}`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchRestoreCircuit(circuitId, rejectWithValue) {
    try {
        const response = await axios.patch(`${baseURL}/circuit/${circuitId}/restore`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchPermanentlyDeleteCircuit(circuitId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/circuit/${circuitId}/permanent`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchBulkUploadCircuits(file, rejectWithValue) {
    try {
        const formData = new FormData()
        formData.append("file", file)
        const response = await axios.post(`${baseURL}/circuit/bulk-upload`, formData, {
            headers: { ...headers(), "Content-Type": "multipart/form-data" },
        })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}
