import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { fetchCreateCircuit, fetchUpdateCircuit, fetchMoveCircuit, fetchDeactivateCircuit, fetchBulkUploadCircuits, fetchCircuitsList } from "./circuitAPI"
import { pageStatusVals } from "./utils"

const initialState = {
    pageStatus: pageStatusVals.idle,
    circuitsList: [],
    circuitsListStatus: pageStatusVals.idle,
    circuitsListError: null,
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

// The flat, cross-customer circuit list used by the SCX Finance dashboard
// table (see fetchCircuitsList) - unlike the rest of this slice, which
// doesn't keep circuit data of its own since it normally lives nested under
// each site in inventorySlice.siteList[].circuitList.
export const getCircuitsList = createAsyncThunk(
    "circuits/fetchCircuitsList",
    async (data, { rejectWithValue }) => {
        const response = await fetchCircuitsList(data, rejectWithValue)
        return response
    }
)

export const circuitSlice = createSlice({
    name: "circuits",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(getCircuitsList.pending, (state) => {
                state.circuitsListStatus = pageStatusVals.loading
                state.circuitsListError = null
            })
            .addCase(getCircuitsList.fulfilled, (state, action) => {
                state.circuitsListStatus = pageStatusVals.fetched
                state.circuitsList = action.payload.results || []
            })
            .addCase(getCircuitsList.rejected, (state, action) => {
                state.circuitsListStatus = pageStatusVals.error
                state.circuitsListError = action.payload
            })
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

export const selectCircuitsList = (state) => state.circuits.circuitsList
export const selectCircuitsListStatus = (state) => state.circuits.circuitsListStatus
export const selectCircuitsListError = (state) => state.circuits.circuitsListError

export default circuitSlice.reducer
