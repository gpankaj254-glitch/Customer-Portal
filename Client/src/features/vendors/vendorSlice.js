import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import {fetchGetVendors, fetchCreateVendor, fetchDeactivateVendor, fetchUpdateVendor, fetchBulkUploadVendors} from "./vendorAPI"
import { pageStatusVals} from "../customers/utils"

const initialState = {
    vendorList: [],
    pageStatus: pageStatusVals.idle,
    getVendorsError: null,
    search: "",
    pagination: {
        page: 0,
        limit: 20,
        totalPages: 0,
        totalResults: 0
    }
}

export const getVendors = createAsyncThunk(
    "vendors/fetchGetVendors",
    async (data, { rejectWithValue }) => {
        const response = await fetchGetVendors(data, rejectWithValue)
        return response
    }
)

export const createVendor = createAsyncThunk(
    "vendors/fetchCreateVendor",
    async (data, { rejectWithValue }) => {
        const response = await fetchCreateVendor(data, rejectWithValue)
        return response
    }
)

export const deactivateVendor = createAsyncThunk(
    "vendors/fetchDeactivateVendor",
    async (vendorId, { rejectWithValue }) => {
        const response = await fetchDeactivateVendor(vendorId, rejectWithValue)
        return response
    }
)

export const updateVendor = createAsyncThunk(
    "vendors/fetchUpdateVendor",
    async (data, { rejectWithValue }) => {
        const response = await fetchUpdateVendor(data, rejectWithValue)
        return response
    }
)

export const bulkUploadVendors = createAsyncThunk(
    "vendors/fetchBulkUploadVendors",
    async (file, { rejectWithValue }) => {
        const response = await fetchBulkUploadVendors(file, rejectWithValue)
        return response
    }
)

export const vendorSlice = createSlice({
    name: "vendors",
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
    },
    extraReducers: (builder) => {
        builder
            .addCase(getVendors.pending, (state) => {
                state.pageStatus = pageStatusVals.loading
            })
            .addCase(getVendors.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                state.vendorList = payload.results
                state.pagination.totalResults = payload.totalResults
                state.pagination.totalPages = payload.totalPages
            })
            .addCase(getVendors.rejected, (state, {payload}) => {
                state.pageStatus = pageStatusVals.error
                state.getVendorsError = payload
            })
            .addCase(createVendor.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(createVendor.rejected, (state) => {
                // Create/edit/delete failures surface via each component's own
                // Snackbar (see .unwrap().catch()) - they must not touch
                // getVendorsError, which VendorTable uses to replace the
                // whole list with an error message.
                state.pageStatus = pageStatusVals.error
            })
            .addCase(deactivateVendor.fulfilled, (state, action) => {
                state.pageStatus = pageStatusVals.fetched
                state.vendorList = state.vendorList.filter((vendor) => vendor.id !== action.meta.arg)
                state.pagination.totalResults = Math.max(0, state.pagination.totalResults - 1)
            })
            .addCase(deactivateVendor.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(updateVendor.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                const index = state.vendorList.findIndex((vendor) => vendor.id === payload.id)
                if (index !== -1) {
                    state.vendorList[index] = payload
                }
            })
            .addCase(updateVendor.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(bulkUploadVendors.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(bulkUploadVendors.rejected, (state) => {
                // Failures (including "some rows invalid") surface via the
                // uploader component's own UI - must not touch
                // getVendorsError.
                state.pageStatus = pageStatusVals.error
            })
    }
})

export const { changePage, changeLimit, setSearch } = vendorSlice.actions

export const selectVendorList = (state) => state.vendors.vendorList
export const selectGetVendorsError = (state) => state.vendors.getVendorsError
export const selectPageStatus = (state) => state.vendors.pageStatus
export const selectPagination = (state) => state.vendors.pagination
export const selectSearch = (state) => state.vendors.search

export default vendorSlice.reducer
