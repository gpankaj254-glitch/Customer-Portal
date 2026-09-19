import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import {fetchGetTickets, fetchCreateTicket, fetchUpdateTicket, fetchAppendTicketDescription, fetchUploadTicketAttachments, fetchAppendVendorDescription, fetchUploadVendorAttachments, fetchBulkUploadTickets, fetchDeactivateTicket} from "./ticketsAPI"
import { pageStatusVals} from "./utils"

const initialState = {
    ticketList: [],
    openTicketList: [],
    closedTicketList: [],
    completedTicketList: [],
    pageStatus: pageStatusVals.loading,
    getTicketError: null,
    createTicketError: null,
    createTicketMessage: null,
    updateTicketError: null,
    updateTicketMessage: null,
    appendDescriptionError: null,
    appendDescriptionMessage: null,
    uploadAttachmentError: null,
    uploadAttachmentMessage: null,
    appendVendorDescriptionError: null,
    appendVendorDescriptionMessage: null,
    uploadVendorAttachmentError: null,
    uploadVendorAttachmentMessage: null,
    search: "",
    // Set when another page (e.g. the dashboard's Open Tickets list) sends
    // the user to a specific ticket - TicketsTable expands that ticket's row
    // once it shows up in the list, then clears this.
    focusTicketId: "",
    pagination: {
        page: 0,
        limit: 20,
        totalPages: 0,
        totalResults: 0
    }
}

export const getTickets = createAsyncThunk(
    "tickets/fetchGetTicket",
    async (data, { rejectWithValue }) => {
        const response = await fetchGetTickets(data, rejectWithValue)
        return response
    }
)

export const getClosedTickets = createAsyncThunk(
    "tickets/fetchGetClosedTicket",
    async (data, { rejectWithValue }) => {
        data.closed = true
        data.status = "Closed"
        const response = await fetchGetTickets(data, rejectWithValue)
        return response
    }
)

export const getCompletedTickets = createAsyncThunk(
    "tickets/fetchGetCompletedTicket",
    async (data, { rejectWithValue }) => {
        data.status = "Completed"
        const response = await fetchGetTickets(data, rejectWithValue)
        return response
    }
)

export const getOpenTickets = createAsyncThunk(
    "tickets/fetchGetOpenTicket",
    async (data, { rejectWithValue }) => {
        data.closed = false
        const response = await fetchGetTickets(data, rejectWithValue)
        return response
    }
)

export const createTicket = createAsyncThunk(
    "tickets/fetchCreateTicket",
    async (data, { rejectWithValue }) => {
        const response = await fetchCreateTicket(data, rejectWithValue)
        return response
    }
)

export const updateTicket = createAsyncThunk(
    "tickets/fetchUpdateTicket",
    async (data, { rejectWithValue }) => {
        const response = await fetchUpdateTicket(data, rejectWithValue)
        return response
    }
)

export const appendTicketDescription = createAsyncThunk(
    "tickets/fetchAppendTicketDescription",
    async (data, { rejectWithValue }) => {
        const response = await fetchAppendTicketDescription(data, rejectWithValue)
        return response
    }
)

export const uploadTicketAttachments = createAsyncThunk(
    "tickets/fetchUploadTicketAttachments",
    async (data, { rejectWithValue }) => {
        const response = await fetchUploadTicketAttachments(data, rejectWithValue)
        return response
    }
)

export const appendVendorDescription = createAsyncThunk(
    "tickets/fetchAppendVendorDescription",
    async (data, { rejectWithValue }) => {
        const response = await fetchAppendVendorDescription(data, rejectWithValue)
        return response
    }
)

export const uploadVendorAttachments = createAsyncThunk(
    "tickets/fetchUploadVendorAttachments",
    async (data, { rejectWithValue }) => {
        const response = await fetchUploadVendorAttachments(data, rejectWithValue)
        return response
    }
)

export const deactivateTicket = createAsyncThunk(
    "tickets/fetchDeactivateTicket",
    async (ticketId, { rejectWithValue }) => {
        const response = await fetchDeactivateTicket(ticketId, rejectWithValue)
        return response
    }
)

export const bulkUploadTickets = createAsyncThunk(
    "tickets/fetchBulkUploadTickets",
    async (file, { rejectWithValue }) => {
        const response = await fetchBulkUploadTickets(file, rejectWithValue)
        return response
    }
)

export const ticketSlice = createSlice({
    name: "tickets",
    initialState,
    reducers: {
        changePage: (state, {payload}) => {
            state.pagination.page = payload
        },
        changeLimit: (state, {payload}) => {
            state.pagination.limit = payload
            state.pagination.page = 0

        },
        setSearch: (state, {payload}) => {
            state.search = payload
            state.pagination.page = 0
        },
        focusTicket: (state, {payload}) => {
            state.search = payload
            state.focusTicketId = payload
            state.pagination.page = 0
        },
        clearFocusTicket: (state) => {
            state.focusTicketId = ""
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getTickets.pending, (state) => {
                state.pageStatus = pageStatusVals.loading
            })
            .addCase(getTickets.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                state.ticketList = payload.results
                state.pagination.totalResults = payload.totalResults
                state.pagination.totalPages = payload.totalPages
            })
            .addCase(getTickets.rejected, (state, {payload}) => {
                state.pageStatus = pageStatusVals.error
                state.getTicketError = payload
            })
            .addCase(getClosedTickets.rejected, (state, {payload}) => {
                state.pageStatus = pageStatusVals.error
                state.getTicketError = payload
            })
            .addCase(getClosedTickets.pending, (state) => {
                state.pageStatus = pageStatusVals.loading
                state.updateTicketMessage = null
                state.updateTicketError = null
            })
            .addCase(getClosedTickets.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                state.closedTicketList = payload.results
                state.pagination.totalResults = payload.totalResults
                state.pagination.totalPages = payload.totalPages
            })
            .addCase(getCompletedTickets.rejected, (state, {payload}) => {
                state.pageStatus = pageStatusVals.error
                state.getTicketError = payload
            })
            .addCase(getCompletedTickets.pending, (state) => {
                state.pageStatus = pageStatusVals.loading
                state.updateTicketMessage = null
                state.updateTicketError = null
            })
            .addCase(getCompletedTickets.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                state.completedTicketList = payload.results
                state.pagination.totalResults = payload.totalResults
                state.pagination.totalPages = payload.totalPages
            })
            .addCase(getOpenTickets.rejected, (state, {payload}) => {
                state.pageStatus = pageStatusVals.error
                state.getTicketError = payload
            })
            .addCase(getOpenTickets.pending, (state) => {
                state.pageStatus = pageStatusVals.loading
                state.updateTicketMessage = null
                state.updateTicketError = null
            })
            .addCase(getOpenTickets.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                state.openTicketList = payload.results
                state.pagination.totalResults = payload.totalResults
                state.pagination.totalPages = payload.totalPages
            })
            .addCase(createTicket.rejected, (state, {payload}) => {
                state.createTicketError = payload
            })
            .addCase(createTicket.fulfilled, (state) => {
                state.createTicketMessage = "Ticket created"
            })
            .addCase(updateTicket.rejected, (state, {payload}) => {
                state.updateTicketMessage = null
                state.updateTicketError = payload
            })
            .addCase(updateTicket.pending, (state) => {
                state.updateTicketMessage = null
                state.updateTicketError = null
            })
            .addCase(updateTicket.fulfilled, (state, { payload }) => {
                state.updateTicketMessage = "Ticket updated"
                state.updateTicketError = null
                // Patch the ticket in place wherever it's currently listed, so
                // an open TicketDetails panel immediately sees the persisted
                // status/closureCode (e.g. to lock the form once Closed is
                // saved) without needing a full list refetch.
                const updated = payload[0]
                const openIndex = state.openTicketList.findIndex((t) => t.id === updated.id)
                if (openIndex !== -1) state.openTicketList[openIndex] = updated
                const closedIndex = state.closedTicketList.findIndex((t) => t.id === updated.id)
                if (closedIndex !== -1) state.closedTicketList[closedIndex] = updated
                const completedIndex = state.completedTicketList.findIndex((t) => t.id === updated.id)
                if (completedIndex !== -1) state.completedTicketList[completedIndex] = updated
            })
            .addCase(appendTicketDescription.rejected, (state, {payload}) => {
                state.appendDescriptionMessage = null
                state.appendDescriptionError = payload
            })
            .addCase(appendTicketDescription.pending, (state) => {
                state.appendDescriptionMessage = null
                state.appendDescriptionError = null
            })
            .addCase(appendTicketDescription.fulfilled, (state) => {
                state.appendDescriptionMessage = "Description updated"
                state.appendDescriptionError = null
            })
            .addCase(uploadTicketAttachments.rejected, (state, {payload}) => {
                state.uploadAttachmentMessage = null
                state.uploadAttachmentError = payload
            })
            .addCase(uploadTicketAttachments.pending, (state) => {
                state.uploadAttachmentMessage = null
                state.uploadAttachmentError = null
            })
            .addCase(uploadTicketAttachments.fulfilled, (state) => {
                state.uploadAttachmentMessage = "Attachment(s) uploaded"
                state.uploadAttachmentError = null
            })
            .addCase(appendVendorDescription.rejected, (state, {payload}) => {
                state.appendVendorDescriptionMessage = null
                state.appendVendorDescriptionError = payload
            })
            .addCase(appendVendorDescription.pending, (state) => {
                state.appendVendorDescriptionMessage = null
                state.appendVendorDescriptionError = null
            })
            .addCase(appendVendorDescription.fulfilled, (state) => {
                state.appendVendorDescriptionMessage = "Vendor description updated"
                state.appendVendorDescriptionError = null
            })
            .addCase(uploadVendorAttachments.rejected, (state, {payload}) => {
                state.uploadVendorAttachmentMessage = null
                state.uploadVendorAttachmentError = payload
            })
            .addCase(uploadVendorAttachments.pending, (state) => {
                state.uploadVendorAttachmentMessage = null
                state.uploadVendorAttachmentError = null
            })
            .addCase(uploadVendorAttachments.fulfilled, (state) => {
                state.uploadVendorAttachmentMessage = "Vendor attachment(s) uploaded"
                state.uploadVendorAttachmentError = null
            })
            .addCase(deactivateTicket.fulfilled, (state, action) => {
                state.pageStatus = pageStatusVals.fetched
                const deletedId = action.meta.arg
                state.openTicketList = state.openTicketList.filter((t) => t.id !== deletedId)
                state.closedTicketList = state.closedTicketList.filter((t) => t.id !== deletedId)
                state.completedTicketList = state.completedTicketList.filter((t) => t.id !== deletedId)
                state.pagination.totalResults = Math.max(0, state.pagination.totalResults - 1)
            })
            .addCase(deactivateTicket.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(bulkUploadTickets.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(bulkUploadTickets.rejected, (state) => {
                // Failures (including "some rows invalid") surface via the
                // uploader component's own UI - must not touch
                // getTicketError.
                state.pageStatus = pageStatusVals.error
            })

    }
})

export const { changePage, changeLimit, setSearch, focusTicket, clearFocusTicket } = ticketSlice.actions

export const selectTicketList = (state) => state.tickets.ticketList
export const selectOpenTicketList = (state) => state.tickets.openTicketList
export const selectClosedTicketList = (state) => state.tickets.closedTicketList
export const selectCompletedTicketList = (state) => state.tickets.completedTicketList

export const selectGetTicketError = (state) => state.tickets.getTicketError
export const selectCreateTicketError = (state) => state.tickets.createTicketError
export const selectCreateTicketMessage = (state) => state.tickets.createTicketMessage
export const selectUpdateTicketError = (state) => state.tickets.updateTicketError
export const selectUpdateTicketMessage = (state) => state.tickets.updateTicketMessage
export const selectAppendDescriptionError = (state) => state.tickets.appendDescriptionError
export const selectAppendDescriptionMessage = (state) => state.tickets.appendDescriptionMessage

export const selectPageStatus = (state) => state.tickets.pageStatus
export const selectPagination = (state) => state.tickets.pagination
export const selectSearch = (state) => state.tickets.search
export const selectFocusTicketId = (state) => state.tickets.focusTicketId

export default ticketSlice.reducer
