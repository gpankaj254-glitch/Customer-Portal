import axios from "axios"
import { createResponseErrorMessage } from "../../utils/responseHandlers"
import { baseURL, headers } from "../../utils/axios"

export async function fetchGetSites(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/site/get?limit=${data.limit}&page=${data.page}&sortBy=name:asc`, { search: data.search || "" }, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchCreateSite(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/site/create`, [data], {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeactivateSite(siteId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/site/${siteId}`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchUpdateSite(data, rejectWithValue) {
    try {
        const { siteId, ...updateBody } = data
        const response = await axios.patch(`${baseURL}/site/${siteId}`, updateBody, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeletedSites(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/site/deleted?limit=${data.limit}&page=${data.page}`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchRestoreSite(siteId, rejectWithValue) {
    try {
        const response = await axios.patch(`${baseURL}/site/${siteId}/restore`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchPermanentlyDeleteSite(siteId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/site/${siteId}/permanent`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchBulkUploadSites(file, rejectWithValue) {
    try {
        const formData = new FormData()
        formData.append("file", file)
        const response = await axios.post(`${baseURL}/site/bulk-upload`, formData, {
            headers: { ...headers(), "Content-Type": "multipart/form-data" },
        })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}
