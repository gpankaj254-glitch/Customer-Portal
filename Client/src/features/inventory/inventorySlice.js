import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import {fetchGetSites} from "./inventoryAPI"
import { pageStatusVals} from "./utils"

const initialState = {
    siteList: [],
    pageStatus: pageStatusVals.loading,
    getSiteError: null,
    search: "",
    // Set by focusSite (see the Finance dashboard's Site Name link) - the
    // site to auto-expand once it's in siteList (see InventoryTable).
    focusSiteId: "",
    pagination: {
        page: 0,
        limit: 200,
        totalPages: 0,
        totalResults: 0
    }
}

export const getSites = createAsyncThunk(
    "inventory/fetchGetSite",
    async (data, { rejectWithValue }) => {
        const response = await fetchGetSites(data, rejectWithValue)
        return response
    }
)

export const inventorySlice = createSlice({
    name: "inventory",
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
        // Search by the site's own name so it's actually in the (search-
        // filtered) list once it loads, and remember its id so the exact
        // site - not just anything matching the name - gets auto-expanded.
        focusSite: (state, {payload}) => {
            state.search = payload.name
            state.focusSiteId = payload.id
            state.pagination.page = 0
        },
        clearFocusSite: (state) => {
            state.focusSiteId = ""
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getSites.pending, (state) => {
                state.pageStatus = pageStatusVals.loading
            })
            .addCase(getSites.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                // state.siteList = createInventory(payload.results)
                state.siteList = payload.results
                state.pagination.totalResults = payload.totalResults
                state.pagination.totalPages = payload.totalPages
                // state.pagination.totalResults = payload.totalResults
            })
            .addCase(getSites.rejected, (state, {payload}) => {
                state.pageStatus = pageStatusVals.error
                state.getSiteError = payload
            })
    }
})

export const { changePage, changeLimit, setSearch, focusSite, clearFocusSite } = inventorySlice.actions

export const selectSiteList = (state) => state.inventory.siteList
export const selectGetSiteError = (state) => state.inventory.getSiteError
export const selectPageStatus = (state) => state.inventory.pageStatus
export const selectPagination = (state) => state.inventory.pagination
export const selectSearch = (state) => state.inventory.search
export const selectFocusSiteId = (state) => state.inventory.focusSiteId

export default inventorySlice.reducer
