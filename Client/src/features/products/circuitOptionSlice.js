import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import {
    fetchCircuitOptionNames,
    fetchManagedCircuitOptions,
    fetchCreateCircuitOption,
    fetchRenameCircuitOption,
    fetchDeactivateCircuitOption,
} from "./circuitOptionAPI"

// "Create Product Management Function for SCX Admin ... Once this is
// changed, these values should be visible in various dropdown menus" - one
// slice, two parallel slots (product/bandwidth) rather than two separate
// slices, since every action here is identical for both, just parameterized
// by `type`.
const initialState = {
    names: { product: [], bandwidth: [] },
    namesStatus: { product: "idle", bandwidth: "idle" },
    managed: { product: [], bandwidth: [] },
    managedStatus: { product: "idle", bandwidth: "idle" },
    saveError: null,
    saveMessage: null,
}

// Every dropdown across the app that used to import the static
// productOptions/bandwidthOptions list directly should dispatch this
// instead (on mount, same pattern as getVendors/getCustomers elsewhere).
export const getCircuitOptionNames = createAsyncThunk(
    "circuitOptions/fetchNames",
    async (type, { rejectWithValue }) => {
        const names = await fetchCircuitOptionNames(type, rejectWithValue)
        return { type, names }
    }
)

// The Product Management page's own list (admin-added options only).
export const getManagedCircuitOptions = createAsyncThunk(
    "circuitOptions/fetchManaged",
    async (type, { rejectWithValue }) => {
        const options = await fetchManagedCircuitOptions(type, rejectWithValue)
        return { type, options }
    }
)

export const createCircuitOption = createAsyncThunk(
    "circuitOptions/fetchCreate",
    async ({ type, name }, { rejectWithValue }) => {
        const option = await fetchCreateCircuitOption({ type, name }, rejectWithValue)
        return { type, option }
    }
)

export const renameCircuitOption = createAsyncThunk(
    "circuitOptions/fetchRename",
    async ({ type, id, name }, { rejectWithValue }) => {
        const option = await fetchRenameCircuitOption(id, name, rejectWithValue)
        return { type, option }
    }
)

export const deactivateCircuitOption = createAsyncThunk(
    "circuitOptions/fetchDeactivate",
    async ({ type, id }, { rejectWithValue }) => {
        await fetchDeactivateCircuitOption(id, rejectWithValue)
        return { type, id }
    }
)

export const circuitOptionSlice = createSlice({
    name: "circuitOptions",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(getCircuitOptionNames.pending, (state, { meta }) => {
                state.namesStatus[meta.arg] = "loading"
            })
            .addCase(getCircuitOptionNames.rejected, (state, { meta }) => {
                state.namesStatus[meta.arg] = "failed"
            })
            .addCase(getCircuitOptionNames.fulfilled, (state, { payload }) => {
                state.names[payload.type] = payload.names
                state.namesStatus[payload.type] = "fetched"
            })
            .addCase(getManagedCircuitOptions.pending, (state, { meta }) => {
                state.managedStatus[meta.arg] = "loading"
            })
            .addCase(getManagedCircuitOptions.rejected, (state, { meta }) => {
                state.managedStatus[meta.arg] = "failed"
            })
            .addCase(getManagedCircuitOptions.fulfilled, (state, { payload }) => {
                state.managed[payload.type] = payload.options
                state.managedStatus[payload.type] = "fetched"
            })
            .addCase(createCircuitOption.rejected, (state, { payload }) => {
                state.saveMessage = null
                state.saveError = payload
            })
            .addCase(createCircuitOption.pending, (state) => {
                state.saveMessage = null
                state.saveError = null
            })
            .addCase(createCircuitOption.fulfilled, (state, { payload }) => {
                state.saveMessage = "Added"
                state.saveError = null
                state.managed[payload.type] = [...state.managed[payload.type], payload.option]
                // Kept in sync directly (no name existed before to collide
                // with) - renaming/deactivating below instead re-fetch the
                // merged list, simpler than patching it in place.
                state.names[payload.type] = [...state.names[payload.type], payload.option.name]
            })
            .addCase(renameCircuitOption.rejected, (state, { payload }) => {
                state.saveMessage = null
                state.saveError = payload
            })
            .addCase(renameCircuitOption.pending, (state) => {
                state.saveMessage = null
                state.saveError = null
            })
            .addCase(renameCircuitOption.fulfilled, (state, { payload }) => {
                state.saveMessage = "Renamed"
                state.saveError = null
                const index = state.managed[payload.type].findIndex((o) => o.id === payload.option.id)
                if (index !== -1) state.managed[payload.type][index] = payload.option
                // `names` (the merged static+managed list dropdowns read) is
                // deliberately not patched here - the component re-dispatches
                // getCircuitOptionNames after a successful rename instead,
                // simpler than reconstructing the merge in place here.
            })
            .addCase(deactivateCircuitOption.rejected, (state, { payload }) => {
                state.saveMessage = null
                state.saveError = payload
            })
            .addCase(deactivateCircuitOption.pending, (state) => {
                state.saveMessage = null
                state.saveError = null
            })
            .addCase(deactivateCircuitOption.fulfilled, (state, { payload }) => {
                state.saveMessage = "Removed"
                state.saveError = null
                state.managed[payload.type] = state.managed[payload.type].filter((o) => o.id !== payload.id)
            })
    },
})

export const selectCircuitOptionNames = (type) => (state) => state.circuitOptions.names[type]
export const selectManagedCircuitOptions = (type) => (state) => state.circuitOptions.managed[type]
export const selectManagedCircuitOptionsStatus = (type) => (state) => state.circuitOptions.managedStatus[type]
export const selectCircuitOptionSaveError = (state) => state.circuitOptions.saveError
export const selectCircuitOptionSaveMessage = (state) => state.circuitOptions.saveMessage

export default circuitOptionSlice.reducer
