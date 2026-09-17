import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { fetchGetOpportunities, fetchCreateOpportunity, fetchDeactivateOpportunity, fetchUpdateOpportunity, fetchSalesDashboardSummary, fetchUploadSupplierCommunicationAttachment, fetchBulkUploadOpportunities, fetchBulkUploadSupplierResponses } from "./opportunityAPI"
import { pageStatusVals } from "./utils"

const initialState = {
    opportunityList: [],
    pageStatus: pageStatusVals.idle,
    getOpportunitiesError: null,
    search: "",
    pagination: {
        page: 0,
        limit: 20,
        totalPages: 0,
        totalResults: 0
    },
    salesDashboardSummary: null,
    salesDashboardSummaryStatus: pageStatusVals.idle,
    salesDashboardSummaryError: null,
}

export const getOpportunities = createAsyncThunk(
    "opportunities/fetchGetOpportunities",
    async (data, { rejectWithValue }) => {
        const response = await fetchGetOpportunities(data, rejectWithValue)
        return response
    }
)

export const createOpportunity = createAsyncThunk(
    "opportunities/fetchCreateOpportunity",
    async (data, { rejectWithValue }) => {
        const response = await fetchCreateOpportunity(data, rejectWithValue)
        return response
    }
)

export const deactivateOpportunity = createAsyncThunk(
    "opportunities/fetchDeactivateOpportunity",
    async (opportunityId, { rejectWithValue }) => {
        const response = await fetchDeactivateOpportunity(opportunityId, rejectWithValue)
        return response
    }
)

export const updateOpportunity = createAsyncThunk(
    "opportunities/fetchUpdateOpportunity",
    async (data, { rejectWithValue }) => {
        const response = await fetchUpdateOpportunity(data, rejectWithValue)
        return response
    }
)

export const uploadSupplierCommunicationAttachment = createAsyncThunk(
    "opportunities/fetchUploadSupplierCommunicationAttachment",
    async (data, { rejectWithValue }) => {
        const response = await fetchUploadSupplierCommunicationAttachment(data, rejectWithValue)
        return response
    }
)

export const bulkUploadOpportunities = createAsyncThunk(
    "opportunities/fetchBulkUploadOpportunities",
    async (file, { rejectWithValue }) => {
        const response = await fetchBulkUploadOpportunities(file, rejectWithValue)
        return response
    }
)

export const bulkUploadSupplierResponses = createAsyncThunk(
    "opportunities/fetchBulkUploadSupplierResponses",
    async (file, { rejectWithValue }) => {
        const response = await fetchBulkUploadSupplierResponses(file, rejectWithValue)
        return response
    }
)

export const getSalesDashboardSummary = createAsyncThunk(
    "opportunities/fetchSalesDashboardSummary",
    async (data, { rejectWithValue }) => {
        const response = await fetchSalesDashboardSummary(rejectWithValue)
        return response
    }
)

export const opportunitySlice = createSlice({
    name: "opportunities",
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
            .addCase(getOpportunities.pending, (state) => {
                state.pageStatus = pageStatusVals.loading
            })
            .addCase(getOpportunities.fulfilled, (state, { payload }) => {
                state.pageStatus = pageStatusVals.fetched
                state.opportunityList = payload.results
                state.pagination.totalResults = payload.totalResults
                state.pagination.totalPages = payload.totalPages
            })
            .addCase(getOpportunities.rejected, (state, { payload }) => {
                state.pageStatus = pageStatusVals.error
                state.getOpportunitiesError = payload
            })
            .addCase(createOpportunity.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(createOpportunity.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(deactivateOpportunity.fulfilled, (state, action) => {
                state.pageStatus = pageStatusVals.fetched
                state.opportunityList = state.opportunityList.filter((opportunity) => opportunity.id !== action.meta.arg)
                state.pagination.totalResults = Math.max(0, state.pagination.totalResults - 1)
            })
            .addCase(deactivateOpportunity.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(updateOpportunity.fulfilled, (state, { payload }) => {
                state.pageStatus = pageStatusVals.fetched
                const index = state.opportunityList.findIndex((opportunity) => opportunity.id === payload.id)
                if (index !== -1) {
                    state.opportunityList[index] = payload
                }
            })
            .addCase(updateOpportunity.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(uploadSupplierCommunicationAttachment.fulfilled, (state, { payload }) => {
                const index = state.opportunityList.findIndex((opportunity) => opportunity.id === payload.id)
                if (index !== -1) {
                    state.opportunityList[index] = payload
                }
            })
            .addCase(bulkUploadOpportunities.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(bulkUploadOpportunities.rejected, (state) => {
                // Failures (including "some rows invalid") surface via the
                // uploader component's own UI - must not touch
                // getOpportunitiesError.
                state.pageStatus = pageStatusVals.error
            })
            .addCase(bulkUploadSupplierResponses.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(bulkUploadSupplierResponses.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(getSalesDashboardSummary.pending, (state) => {
                state.salesDashboardSummaryStatus = pageStatusVals.loading
            })
            .addCase(getSalesDashboardSummary.fulfilled, (state, { payload }) => {
                state.salesDashboardSummaryStatus = pageStatusVals.fetched
                state.salesDashboardSummary = payload
            })
            .addCase(getSalesDashboardSummary.rejected, (state, { payload }) => {
                state.salesDashboardSummaryStatus = pageStatusVals.error
                state.salesDashboardSummaryError = payload
            })
    }
})

export const { changePage, changeLimit, setSearch } = opportunitySlice.actions

export const selectOpportunityList = (state) => state.opportunities.opportunityList
export const selectGetOpportunitiesError = (state) => state.opportunities.getOpportunitiesError
export const selectPageStatus = (state) => state.opportunities.pageStatus
export const selectPagination = (state) => state.opportunities.pagination
export const selectSearch = (state) => state.opportunities.search
export const selectSalesDashboardSummary = (state) => state.opportunities.salesDashboardSummary
export const selectSalesDashboardSummaryStatus = (state) => state.opportunities.salesDashboardSummaryStatus
export const selectSalesDashboardSummaryError = (state) => state.opportunities.salesDashboardSummaryError

export default opportunitySlice.reducer
