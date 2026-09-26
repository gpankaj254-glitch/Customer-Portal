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
        // getClosedTickets passes an array (["Closed", "RFO Closed"]) so both
        // statuses show up in the Closed Tickets list ("RFO Closed" behaves
        // like Closed) - sent as a plain array (not { $in: [...] }), since
        // express-mongo-sanitize (see app.js) strips any $-prefixed key out
        // of the request body; the server builds the actual $in itself (see
        // ticket.controller.js's getTickets).
        if (data.status !== undefined) filter.status = data.status
        // "View Open RFO ... Logic where 'RFO Request Received = Yes' 'RFO
        // Status is not Closed'" - getOpenRfoTickets (ticketSlice.js) sets
        // this plain flag; the server builds the actual rfo.* filter from
        // it (see ticket.controller.js's getTickets).
        if (data.rfoOpen !== undefined) filter.rfoOpen = data.rfoOpen
        // "View Closed and Completed Tickets - Sort Descending Order by
        // Ticket Close date" - getTickets (ticket.controller.js) only reads
        // sortBy from the query string (same as every other list endpoint
        // in this app), not the body, so it has to be appended here rather
        // than left in filter.
        const sortByParam = data.sortBy ? `&sortBy=${encodeURIComponent(data.sortBy)}` : ""
        const response = await axios.post(`${baseURL}/ticket/get?limit=${data.limit}&page=${data.page}${sortByParam}`, filter, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

// "SCX NOC Users/Admin: EDIT Modify Ticket" - RFO Request tab's own
// dedicated endpoint (stays editable even once the ticket is Closed/
// Completed - see ticket.service.js's saveTicketRfo), separate from the
// general fetchUpdateTicket above.
export async function fetchSaveTicketRfo (ticketId, data, rejectWithValue) {
    try {
        const response = await axios.patch(`${baseURL}/ticket/${ticketId}/rfo`, data, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeactivateTicket (ticketId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/ticket/${ticketId}`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeletedTickets (data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/ticket/deleted?limit=${data.limit}&page=${data.page}`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchRestoreTicket (ticketId, rejectWithValue) {
    try {
        const response = await axios.patch(`${baseURL}/ticket/${ticketId}/restore`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchPermanentlyDeleteTicket (ticketId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/ticket/${ticketId}/permanent`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}