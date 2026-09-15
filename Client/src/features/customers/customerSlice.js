import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import {fetchGetCustomers, fetchCreateCustomer, fetchDeactivateCustomer, fetchUpdateCustomer} from "./customerAPI"
import { pageStatusVals} from "./utils"

const initialState = {
    customerList: [],
    pageStatus: pageStatusVals.idle,
    getCustomersError: null,
    search: "",
    pagination: {
        page: 0,
        limit: 20,
        totalPages: 0,
        totalResults: 0
    }
}

export const getCustomers = createAsyncThunk(
    "customers/fetchGetCustomers",
    async (data, { rejectWithValue }) => {
        const response = await fetchGetCustomers(data, rejectWithValue)
        return response
    }
)

export const createCustomer = createAsyncThunk(
    "customers/fetchCreateCustomer",
    async (data, { rejectWithValue }) => {
        const response = await fetchCreateCustomer(data, rejectWithValue)
        return response
    }
)

export const deactivateCustomer = createAsyncThunk(
    "customers/fetchDeactivateCustomer",
    async (customerId, { rejectWithValue }) => {
        const response = await fetchDeactivateCustomer(customerId, rejectWithValue)
        return response
    }
)

export const updateCustomer = createAsyncThunk(
    "customers/fetchUpdateCustomer",
    async (data, { rejectWithValue }) => {
        const response = await fetchUpdateCustomer(data, rejectWithValue)
        return response
    }
)

export const customerSlice = createSlice({
    name: "customers",
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
            .addCase(getCustomers.pending, (state) => {
                state.pageStatus = pageStatusVals.loading
            })
            .addCase(getCustomers.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                state.customerList = payload.results
                state.pagination.totalResults = payload.totalResults
                state.pagination.totalPages = payload.totalPages
            })
            .addCase(getCustomers.rejected, (state, {payload}) => {
                state.pageStatus = pageStatusVals.error
                state.getCustomersError = payload
            })
            .addCase(createCustomer.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(createCustomer.rejected, (state) => {
                // Create/edit/delete failures surface via each component's own
                // Snackbar (see .unwrap().catch()) - they must not touch
                // getCustomersError, which CustomerTable uses to replace the
                // whole list with an error message.
                state.pageStatus = pageStatusVals.error
            })
            .addCase(deactivateCustomer.fulfilled, (state, action) => {
                state.pageStatus = pageStatusVals.fetched
                state.customerList = state.customerList.filter((customer) => customer.id !== action.meta.arg)
                state.pagination.totalResults = Math.max(0, state.pagination.totalResults - 1)
            })
            .addCase(deactivateCustomer.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(updateCustomer.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                const index = state.customerList.findIndex((customer) => customer.id === payload.id)
                if (index !== -1) {
                    state.customerList[index] = payload
                }
            })
            .addCase(updateCustomer.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
    }
})

export const { changePage, changeLimit, setSearch } = customerSlice.actions

export const selectCustomerList = (state) => state.customers.customerList
export const selectGetCustomersError = (state) => state.customers.getCustomersError
export const selectGetCustomersMessage = (state) => state.customers.getCustomersError
export const selectPageStatus = (state) => state.customers.pageStatus
export const selectPagination = (state) => state.customers.pagination
export const selectSearch = (state) => state.customers.search

export default customerSlice.reducer