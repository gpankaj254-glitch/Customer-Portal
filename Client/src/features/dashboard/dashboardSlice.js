import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { fetchDashboardSummary, fetchOpenTicketsAnalysis, fetchClosedTicketsAnalysis, fetchClosedTicketsList } from "./dashboardAPI"
import { pageStatusVals } from "../tickets/utils"

const initialState = {
    summary: null,
    summaryStatus: pageStatusVals.idle,
    summaryError: null,
    openTicketsAnalysis: null,
    openTicketsAnalysisStatus: pageStatusVals.idle,
    openTicketsAnalysisError: null,
    closedTicketsAnalysis: null,
    closedTicketsAnalysisStatus: pageStatusVals.idle,
    closedTicketsAnalysisError: null,
    closedTicketsList: null,
    closedTicketsListStatus: pageStatusVals.idle,
    closedTicketsListError: null,
}

export const getDashboardSummary = createAsyncThunk(
    "dashboard/fetchSummary",
    async (data, { rejectWithValue }) => {
        const response = await fetchDashboardSummary(rejectWithValue)
        return response
    }
)

export const getOpenTicketsAnalysis = createAsyncThunk(
    "dashboard/fetchOpenTicketsAnalysis",
    async (data, { rejectWithValue }) => {
        const response = await fetchOpenTicketsAnalysis(rejectWithValue)
        return response
    }
)

export const getClosedTicketsList = createAsyncThunk(
    "dashboard/fetchClosedTicketsList",
    async (data, { rejectWithValue }) => {
        const response = await fetchClosedTicketsList(data, rejectWithValue)
        return response
    }
)

export const getClosedTicketsAnalysis = createAsyncThunk(
    "dashboard/fetchClosedTicketsAnalysis",
    async (data, { rejectWithValue }) => {
        const response = await fetchClosedTicketsAnalysis(data, rejectWithValue)
        return response
    }
)

export const dashboardSlice = createSlice({
    name: "dashboard",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(getDashboardSummary.pending, (state) => {
                state.summaryStatus = pageStatusVals.loading
            })
            .addCase(getDashboardSummary.fulfilled, (state, {payload}) => {
                state.summaryStatus = pageStatusVals.fetched
                state.summary = payload
            })
            .addCase(getDashboardSummary.rejected, (state, {payload}) => {
                state.summaryStatus = pageStatusVals.error
                state.summaryError = payload
            })
            .addCase(getOpenTicketsAnalysis.pending, (state) => {
                state.openTicketsAnalysisStatus = pageStatusVals.loading
            })
            .addCase(getOpenTicketsAnalysis.fulfilled, (state, {payload}) => {
                state.openTicketsAnalysisStatus = pageStatusVals.fetched
                state.openTicketsAnalysis = payload
            })
            .addCase(getOpenTicketsAnalysis.rejected, (state, {payload}) => {
                state.openTicketsAnalysisStatus = pageStatusVals.error
                state.openTicketsAnalysisError = payload
            })
            .addCase(getClosedTicketsList.pending, (state) => {
                state.closedTicketsListStatus = pageStatusVals.loading
                state.closedTicketsListError = null
            })
            .addCase(getClosedTicketsList.fulfilled, (state, {payload}) => {
                state.closedTicketsListStatus = pageStatusVals.fetched
                state.closedTicketsList = payload
            })
            .addCase(getClosedTicketsList.rejected, (state, {payload}) => {
                state.closedTicketsListStatus = pageStatusVals.error
                state.closedTicketsListError = payload
            })
            .addCase(getClosedTicketsAnalysis.pending, (state) => {
                state.closedTicketsAnalysisStatus = pageStatusVals.loading
            })
            .addCase(getClosedTicketsAnalysis.fulfilled, (state, {payload}) => {
                state.closedTicketsAnalysisStatus = pageStatusVals.fetched
                state.closedTicketsAnalysis = payload
            })
            .addCase(getClosedTicketsAnalysis.rejected, (state, {payload}) => {
                state.closedTicketsAnalysisStatus = pageStatusVals.error
                state.closedTicketsAnalysisError = payload
            })
    }
})

export const selectDashboardSummary = (state) => state.dashboard.summary
export const selectDashboardSummaryStatus = (state) => state.dashboard.summaryStatus
export const selectDashboardSummaryError = (state) => state.dashboard.summaryError
export const selectOpenTicketsAnalysis = (state) => state.dashboard.openTicketsAnalysis
export const selectOpenTicketsAnalysisStatus = (state) => state.dashboard.openTicketsAnalysisStatus
export const selectOpenTicketsAnalysisError = (state) => state.dashboard.openTicketsAnalysisError
export const selectClosedTicketsAnalysis = (state) => state.dashboard.closedTicketsAnalysis
export const selectClosedTicketsAnalysisStatus = (state) => state.dashboard.closedTicketsAnalysisStatus
export const selectClosedTicketsAnalysisError = (state) => state.dashboard.closedTicketsAnalysisError
export const selectClosedTicketsList = (state) => state.dashboard.closedTicketsList
export const selectClosedTicketsListStatus = (state) => state.dashboard.closedTicketsListStatus
export const selectClosedTicketsListError = (state) => state.dashboard.closedTicketsListError

export default dashboardSlice.reducer
