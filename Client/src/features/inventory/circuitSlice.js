import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { fetchCreateCircuit, fetchUpdateCircuit, fetchMoveCircuit, fetchDeactivateCircuit, fetchBulkUploadCircuits } from "./circuitAPI"
import { pageStatusVals } from "./utils"

const initialState = {
    pageStatus: pageStatusVals.idle,
}

export const createCircuit = createAsyncThunk(
    "circuits/fetchCreateCircuit",
    async (data, { rejectWithValue }) => {
        const response = await fetchCreateCircuit(data, rejectWithValue)
        return response
    }
)

export const updateCircuit = createAsyncThunk(
    "circuits/fetchUpdateCircuit",
    async (data, { rejectWithValue }) => {
        const response = await fetchUpdateCircuit(data, rejectWithValue)
        return response
    }
)

export const moveCircuit = createAsyncThunk(
    "circuits/fetchMoveCircuit",
    async (data, { rejectWithValue }) => {
        const response = await fetchMoveCircuit(data, rejectWithValue)
        return response
    }
)

export const deactivateCircuit = createAsyncThunk(
    "circuits/fetchDeactivateCircuit",
    async (circuitId, { rejectWithValue }) => {
        const response = await fetchDeactivateCircuit(circuitId, rejectWithValue)
        return response
    }
)

export const bulkUploadCircuits = createAsyncThunk(
    "circuits/fetchBulkUploadCircuits",
    async (file, { rejectWithValue }) => {
        const response = await fetchBulkUploadCircuits(file, rejectWithValue)
        return response
    }
)

// Circuits don't keep their own list in this slice - the display data lives
// nested under each site in inventorySlice.siteList[].circuitList, so
// callers refetch that list (getSites) after a mutation succeeds.
export const circuitSlice = createSlice({
    name: "circuits",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(createCircuit.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(createCircuit.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(updateCircuit.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(updateCircuit.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(moveCircuit.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(moveCircuit.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(deactivateCircuit.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(deactivateCircuit.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(bulkUploadCircuits.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(bulkUploadCircuits.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
    }
})

export default circuitSlice.reducer
