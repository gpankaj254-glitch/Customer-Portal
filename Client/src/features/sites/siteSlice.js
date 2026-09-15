import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { fetchGetSites, fetchCreateSite, fetchDeactivateSite, fetchUpdateSite, fetchBulkUploadSites } from "./siteAPI"
import { pageStatusVals } from "../customers/utils"

const initialState = {
    siteList: [],
    pageStatus: pageStatusVals.idle,
    getSitesError: null,
    search: "",
    pagination: {
        page: 0,
        limit: 20,
        totalPages: 0,
        totalResults: 0
    }
}

export const getSites = createAsyncThunk(
    "sites/fetchGetSites",
    async (data, { rejectWithValue }) => {
        const response = await fetchGetSites(data, rejectWithValue)
        return response
    }
)

export const createSite = createAsyncThunk(
    "sites/fetchCreateSite",
    async (data, { rejectWithValue }) => {
        const response = await fetchCreateSite(data, rejectWithValue)
        return response
    }
)

export const deactivateSite = createAsyncThunk(
    "sites/fetchDeactivateSite",
    async (siteId, { rejectWithValue }) => {
        const response = await fetchDeactivateSite(siteId, rejectWithValue)
        return response
    }
)

export const updateSite = createAsyncThunk(
    "sites/fetchUpdateSite",
    async (data, { rejectWithValue }) => {
        const response = await fetchUpdateSite(data, rejectWithValue)
        return response
    }
)

export const bulkUploadSites = createAsyncThunk(
    "sites/fetchBulkUploadSites",
    async (file, { rejectWithValue }) => {
        const response = await fetchBulkUploadSites(file, rejectWithValue)
        return response
    }
)

export const siteSlice = createSlice({
    name: "sites",
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
            .addCase(getSites.pending, (state) => {
                state.pageStatus = pageStatusVals.loading
            })
            .addCase(getSites.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                state.siteList = payload.results
                state.pagination.totalResults = payload.totalResults
                state.pagination.totalPages = payload.totalPages
                state.getSitesError = null
            })
            .addCase(getSites.rejected, (state, {payload}) => {
                state.pageStatus = pageStatusVals.error
                state.getSitesError = payload
            })
            .addCase(createSite.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(createSite.rejected, (state) => {
                // Create/edit/delete failures surface via each component's own
                // Snackbar (see .unwrap().catch()) - they must not touch
                // getSitesError, which SiteTable uses to replace the whole
                // list with an error message.
                state.pageStatus = pageStatusVals.error
            })
            .addCase(deactivateSite.fulfilled, (state, action) => {
                state.pageStatus = pageStatusVals.fetched
                state.siteList = state.siteList.filter((site) => site.id !== action.meta.arg)
                state.pagination.totalResults = Math.max(0, state.pagination.totalResults - 1)
            })
            .addCase(deactivateSite.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(updateSite.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                const index = state.siteList.findIndex((site) => site.id === payload.id)
                if (index !== -1) {
                    // Merge rather than replace: payload is the raw updated site
                    // doc and lacks the circuitList/contactList/circuitCount
                    // fields getSites attaches, which other UI may still rely on.
                    state.siteList[index] = { ...state.siteList[index], ...payload }
                }
            })
            .addCase(updateSite.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(bulkUploadSites.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(bulkUploadSites.rejected, (state) => {
                // Failures (including "some rows invalid") surface via the
                // uploader component's own UI - must not touch getSitesError.
                state.pageStatus = pageStatusVals.error
            })
    }
})

export const { changePage, changeLimit, setSearch } = siteSlice.actions
export const selectSiteList = (state) => state.sites.siteList
export const selectGetSitesError = (state) => state.sites.getSitesError
export const selectPagination = (state) => state.sites.pagination
export const selectSearch = (state) => state.sites.search

export default siteSlice.reducer
