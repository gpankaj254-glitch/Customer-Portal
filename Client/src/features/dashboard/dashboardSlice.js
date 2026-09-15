import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { fetchDashboardSummary, fetchClosedTicketsAnalysis } from "./dashboardAPI"
import { pageStatusVals } from "../tickets/utils"

const initialState = {
    summary: null,
    summaryStatus: pageStatusVals.idle,
    summaryError: null,
    closedTicketsAnalysis: null,
    closedTicketsAnalysisStatus: pageStatusVals.idle,
    closedTicketsAnalysisError: null,
}

export const getDashboardSummary = createAsyncThunk(
    "dashboard/fetchSummary",
    async (data, { rejectWithValue }) => {
        const response = await fetchDashboardSummary(rejectWithValue)
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
export const selectClosedTicketsAnalysis = (state) => state.dashboard.closedTicketsAnalysis
export const selectClosedTicketsAnalysisStatus = (state) => state.dashboard.closedTicketsAnalysisStatus
export const selectClosedTicketsAnalysisError = (state) => state.dashboard.closedTicketsAnalysisError

export default dashboardSlice.reducer
