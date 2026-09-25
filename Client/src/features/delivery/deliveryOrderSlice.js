import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import {
    fetchCreateDeliveryOrder,
    fetchGetDeliveryOrders,
    fetchUpdateDeliveryOrder,
    fetchResolveCircuitDuplicate,
    fetchDeactivateDeliveryOrder,
    fetchBulkUploadDeliveryOrders,
    fetchBulkUploadClosedDeliveryOrders,
} from "./deliveryOrderAPI"
import { pageStatusVals } from "./utils"

// "Display View Open Orders sorted on Serial Number lowest first" - a
// numeric-aware compare, since Serial Number is free text that mixes plain
// numbers ("144") and prefixed codes ("FL02"); { numeric: true } sorts the
// embedded numbers in natural order (9 before 10) rather than as plain text
// (10 before 9). Blank serial numbers sort first.
function sortBySerialNumber(list) {
    return [...list].sort((a, b) =>
        String(a.serialNumber || "").localeCompare(String(b.serialNumber || ""), undefined, { numeric: true, sensitivity: "base" })
    )
}

const initialState = {
    // Two lists, one per tab - mirrors ticketSlice's
    // openTicketList/closedTicketList. "View Open Order" is every status
    // except Completed; "Delivered Orders" is Status: Completed - see
    // getDeliveryOrders below.
    openOrderList: [],
    deliveredOrderList: [],
    pageStatus: pageStatusVals.idle,
    getOrdersError: null,
    search: "",
    pagination: {
        page: 0,
        limit: 1000,
        totalPages: 0,
        totalResults: 0,
    },
}

// tab: "open" | "completed" - the server builds the actual Status filter
// from this plain string (see deliveryOrder.controller.js / deliveryOrderAPI.js).
export const getDeliveryOrders = createAsyncThunk(
    "deliveryOrders/fetchGetDeliveryOrders",
    async (data, { rejectWithValue }) => {
        const response = await fetchGetDeliveryOrders(data, rejectWithValue)
        return { ...response, tab: data.tab }
    }
)

export const createDeliveryOrder = createAsyncThunk(
    "deliveryOrders/fetchCreateDeliveryOrder",
    async (data, { rejectWithValue }) => {
        const response = await fetchCreateDeliveryOrder(data, rejectWithValue)
        return response
    }
)

export const updateDeliveryOrder = createAsyncThunk(
    "deliveryOrders/fetchUpdateDeliveryOrder",
    async (data, { rejectWithValue }) => {
        const response = await fetchUpdateDeliveryOrder(data, rejectWithValue)
        return response
    }
)

// "Pop and show changes being made, take user's Ok to proceed" - confirms
// a pending Duplicate Circuit ID resolution reported by updateDeliveryOrder
// (see OrderDetails.js's duplicatePending state).
export const resolveCircuitDuplicate = createAsyncThunk(
    "deliveryOrders/fetchResolveCircuitDuplicate",
    async (deliveryOrderId, { rejectWithValue }) => {
        const response = await fetchResolveCircuitDuplicate(deliveryOrderId, rejectWithValue)
        return response
    }
)

export const deactivateDeliveryOrder = createAsyncThunk(
    "deliveryOrders/fetchDeactivateDeliveryOrder",
    async (deliveryOrderId, { rejectWithValue }) => {
        const response = await fetchDeactivateDeliveryOrder(deliveryOrderId, rejectWithValue)
        return response
    }
)

export const bulkUploadDeliveryOrders = createAsyncThunk(
    "deliveryOrders/fetchBulkUploadDeliveryOrders",
    async (file, { rejectWithValue }) => {
        const response = await fetchBulkUploadDeliveryOrders(file, rejectWithValue)
        return response
    }
)

export const bulkUploadClosedDeliveryOrders = createAsyncThunk(
    "deliveryOrders/fetchBulkUploadClosedDeliveryOrders",
    async (file, { rejectWithValue }) => {
        const response = await fetchBulkUploadClosedDeliveryOrders(file, rejectWithValue)
        return response
    }
)

export const deliveryOrderSlice = createSlice({
    name: "deliveryOrders",
    initialState,
    reducers: {
        changePage: (state, { payload }) => {
            state.pagination.page = payload
        },
        changeLimit: (state, { payload }) => {
            state.pagination.limit = payload
            state.pagination.page = 0
        },
        setSearch: (state, { payload }) => {
            state.search = payload
            state.pagination.page = 0
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getDeliveryOrders.pending, (state) => {
                state.pageStatus = pageStatusVals.loading
            })
            .addCase(getDeliveryOrders.fulfilled, (state, { payload }) => {
                state.pageStatus = pageStatusVals.fetched
                if (payload.tab === "completed") {
                    state.deliveredOrderList = payload.results
                } else {
                    state.openOrderList = sortBySerialNumber(payload.results)
                }
                state.pagination.totalResults = payload.totalResults
                state.pagination.totalPages = payload.totalPages
            })
            .addCase(getDeliveryOrders.rejected, (state, { payload }) => {
                state.pageStatus = pageStatusVals.error
                state.getOrdersError = payload
            })
            .addCase(createDeliveryOrder.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(createDeliveryOrder.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(updateDeliveryOrder.fulfilled, (state, { payload }) => {
                state.pageStatus = pageStatusVals.fetched
                // The order may now belong in the other list (status just
                // changed) - simplest correct handling is to drop it from
                // both and let the tab's own effect refetch.
                state.openOrderList = state.openOrderList.filter((order) => order.id !== payload.id)
                state.deliveredOrderList = state.deliveredOrderList.filter((order) => order.id !== payload.id)
                if (payload.status === "Completed") {
                    state.deliveredOrderList = [payload, ...state.deliveredOrderList]
                } else {
                    state.openOrderList = sortBySerialNumber([payload, ...state.openOrderList])
                }
            })
            .addCase(updateDeliveryOrder.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            // Same shape/placement logic as updateDeliveryOrder.fulfilled -
            // the order's own status never changes here (it was already
            // Completed), so this always lands back in deliveredOrderList.
            .addCase(resolveCircuitDuplicate.fulfilled, (state, { payload }) => {
                state.pageStatus = pageStatusVals.fetched
                state.openOrderList = state.openOrderList.filter((order) => order.id !== payload.id)
                state.deliveredOrderList = state.deliveredOrderList.filter((order) => order.id !== payload.id)
                if (payload.status === "Completed") {
                    state.deliveredOrderList = [payload, ...state.deliveredOrderList]
                } else {
                    state.openOrderList = sortBySerialNumber([payload, ...state.openOrderList])
                }
            })
            .addCase(resolveCircuitDuplicate.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(deactivateDeliveryOrder.fulfilled, (state, action) => {
                state.pageStatus = pageStatusVals.fetched
                state.openOrderList = state.openOrderList.filter((order) => order.id !== action.meta.arg)
                state.deliveredOrderList = state.deliveredOrderList.filter((order) => order.id !== action.meta.arg)
                state.pagination.totalResults = Math.max(0, state.pagination.totalResults - 1)
            })
            .addCase(deactivateDeliveryOrder.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(bulkUploadDeliveryOrders.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(bulkUploadDeliveryOrders.rejected, (state) => {
                // Failures (including "some rows invalid") surface via the
                // uploader component's own UI - must not touch getOrdersError.
                state.pageStatus = pageStatusVals.error
            })
            .addCase(bulkUploadClosedDeliveryOrders.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(bulkUploadClosedDeliveryOrders.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
    }
})

export const { changePage, changeLimit, setSearch } = deliveryOrderSlice.actions

export const selectOpenOrderList = (state) => state.deliveryOrders.openOrderList
export const selectDeliveredOrderList = (state) => state.deliveryOrders.deliveredOrderList
export const selectGetOrdersError = (state) => state.deliveryOrders.getOrdersError
export const selectPageStatus = (state) => state.deliveryOrders.pageStatus
export const selectPagination = (state) => state.deliveryOrders.pagination
export const selectSearch = (state) => state.deliveryOrders.search

export default deliveryOrderSlice.reducer
