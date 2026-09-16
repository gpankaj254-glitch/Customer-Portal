import { createResponseErrorMessage } from "../../utils/responseHandlers"
import axios from "axios"
import { baseURL, headers } from "../../utils/axios"


export async function fetchCreateTicket (data, rejectWithValue) {
    console.log(data)

    try {
        const response = await axios.post(`${baseURL}/ticket/create`, data, {headers: headers()})
        console.log(response)

        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchUpdateTicket (data, rejectWithValue) {
    console.log(data)

    try {
        const response = await axios.post(`${baseURL}/ticket/update`, data, {headers: headers()})
        console.log(response)

        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchAppendTicketDescription (data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/ticket/append-description`, data, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchUploadTicketAttachments ({ ticketId, files }, rejectWithValue) {
    try {
        const formData = new FormData()
        files.forEach((file) => formData.append("files", file))
        const response = await axios.post(`${baseURL}/ticket/upload-attachment/${ticketId}`, formData, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

// The attachment endpoint requires auth, so a plain <a href> can't be used -
// fetch it as a blob with the auth header, then trigger a normal file save.
export async function downloadTicketAttachment (ticketId, attachmentId, originalName) {
    const response = await axios.get(`${baseURL}/ticket/attachment/${ticketId}/${attachmentId}`, {
        headers: headers(),
        responseType: "blob",
    })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", originalName || attachmentId)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export async function fetchAppendVendorDescription (data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/ticket/append-vendor-description`, data, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchUploadVendorAttachments ({ ticketId, files }, rejectWithValue) {
    try {
        const formData = new FormData()
        files.forEach((file) => formData.append("files", file))
        const response = await axios.post(`${baseURL}/ticket/upload-vendor-attachment/${ticketId}`, formData, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function downloadVendorAttachment (ticketId, attachmentId, originalName) {
    const response = await axios.get(`${baseURL}/ticket/vendor-attachment/${ticketId}/${attachmentId}`, {
        headers: headers(),
        responseType: "blob",
    })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", originalName || attachmentId)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export async function fetchBulkUploadTickets (file, rejectWithValue) {
    try {
        const formData = new FormData()
        formData.append("file", file)
        const response = await axios.post(`${baseURL}/ticket/bulk-upload`, formData, {
            headers: { ...headers(), "Content-Type": "multipart/form-data" },
        })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchGetTickets (data, rejectWithValue) {
    try {
        const filter = { search: data.search || "" }
        if (data.closed !== undefined) filter.closed = data.closed
        if (data.status !== undefined) filter.status = data.status
        const response = await axios.post(`${baseURL}/ticket/get?limit=${data.limit}&page=${data.page}`, filter, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}