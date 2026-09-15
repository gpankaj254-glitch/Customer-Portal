import { createResponseErrorMessage } from "../../utils/responseHandlers"
import axios from "axios"
import { baseURL, headers } from "../../utils/axios"

export async function fetchGetVendors (data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/vendor/get?limit=${data.limit}&page=${data.page}&sortBy=name:asc`, { search: data.search || "" }, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchCreateVendor(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/vendor/create`, [{
            name: data.name,
            vendorUptime: data.vendorUptime || "",
            vendorMTTR: data.vendorMTTR || "",
        }], {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeactivateVendor(vendorId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/vendor/${vendorId}`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchUpdateVendor(data, rejectWithValue) {
    try {
        const { vendorId, ...updateBody } = data
        const response = await axios.patch(`${baseURL}/vendor/${vendorId}`, updateBody, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeletedVendors(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/vendor/deleted?limit=${data.limit}&page=${data.page}`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchRestoreVendor(vendorId, rejectWithValue) {
    try {
        const response = await axios.patch(`${baseURL}/vendor/${vendorId}/restore`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchBulkUploadVendors(file, rejectWithValue) {
    try {
        const formData = new FormData()
        formData.append("file", file)
        const response = await axios.post(`${baseURL}/vendor/bulk-upload`, formData, {
            headers: { ...headers(), "Content-Type": "multipart/form-data" },
        })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}
