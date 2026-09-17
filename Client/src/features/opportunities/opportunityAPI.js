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

export async function fetchSalesDashboardSummary(rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/opportunity/dashboard-summary`, {}, { headers: headers() })
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

export async function fetchUploadSupplierCommunicationAttachment({ opportunityId, entryId, files }, rejectWithValue) {
    try {
        const formData = new FormData()
        files.forEach((file) => formData.append("files", file))
        const response = await axios.post(
            `${baseURL}/opportunity/${opportunityId}/supplier-communications/${entryId}/attachment`,
            formData,
            { headers: headers() }
        )
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchBulkUploadOpportunities(file, rejectWithValue) {
    try {
        const formData = new FormData()
        formData.append("file", file)
        const response = await axios.post(`${baseURL}/opportunity/bulk-upload`, formData, {
            headers: { ...headers(), "Content-Type": "multipart/form-data" },
        })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchBulkUploadSupplierResponses(file, rejectWithValue) {
    try {
        const formData = new FormData()
        formData.append("file", file)
        const response = await axios.post(`${baseURL}/opportunity/bulk-upload-supplier-responses`, formData, {
            headers: { ...headers(), "Content-Type": "multipart/form-data" },
        })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

// The attachment endpoint requires auth, so a plain <a href> can't be used -
// fetch it as a blob with the auth header, then trigger a normal file save.
export async function downloadSupplierCommunicationAttachment(opportunityId, entryId, attachmentId, originalName) {
    const response = await axios.get(
        `${baseURL}/opportunity/${opportunityId}/supplier-communications/${entryId}/attachment/${attachmentId}`,
        { headers: headers(), responseType: "blob" }
    )
    const url = URL.createObjectURL(response.data)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", originalName || attachmentId)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
