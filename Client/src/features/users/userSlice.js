import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import {fetchGetUsers, fetchCreateUser, fetchDeleteUser, fetchUpdateUser, fetchResetUserPassword} from "./userAPI"
// import getPermissions from "./permissions"
import { pageStatusVals} from "./utils"
import _ from "lodash"

const initialState = {
    userList: [],
    // totalUserCount: 0,
    pageStatus: pageStatusVals.idle,
    getUsersError: null,
    createUserError: null,
    search: "",
    pagination: {
        page: 0,
        limit: 20,
        totalPages: 0,
        totalResults: 0
    }
    // isUserLoggedIn: false,
    // user: {},
    // tokens: {},
    // permisiions: [],
}

export const getUsers = createAsyncThunk(
    "users/fetchGetUsers",
    async (data, { rejectWithValue }) => {
        const response = await fetchGetUsers(data, rejectWithValue)
        return response
    }
)

export const createUser = createAsyncThunk(
    "users/fetchCreateUser",
    async (data, { rejectWithValue }) => {
        const response = await fetchCreateUser(data, rejectWithValue)
        return response
    }
)

export const deleteUser = createAsyncThunk(
    "users/fetchDeleteUser",
    async (userId, { rejectWithValue }) => {
        const response = await fetchDeleteUser(userId, rejectWithValue)
        return response
    }
)

export const updateUser = createAsyncThunk(
    "users/fetchUpdateUser",
    async (data, { rejectWithValue }) => {
        const response = await fetchUpdateUser(data, rejectWithValue)
        return response
    }
)

export const resetUserPassword = createAsyncThunk(
    "users/fetchResetUserPassword",
    async (data, { rejectWithValue }) => {
        const response = await fetchResetUserPassword(data, rejectWithValue)
        return response
    }
)

// export const logout = createAsyncThunk(
// 	"user/fetchLogout",
// 	async (data, { rejectWithValue }) => {
// 		const response = await fetchLogout(data, rejectWithValue)
// 		return response
// 	}
// )

export const userSlice = createSlice({
    name: "users",
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
            .addCase(getUsers.pending, (state) => {
                state.pageStatus = pageStatusVals.loading
            })
            .addCase(getUsers.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                state.userList = payload.results
                state.pagination.totalResults = payload.totalResults
                state.pagination.totalPages = payload.totalPages
                state.getUsersError = null
                // state.pagination.totalResults = payload.totalResults
            })
            .addCase(getUsers.rejected, (state, {payload}) => {
                state.pageStatus = pageStatusVals.error
                state.getUsersError = payload
            })
            .addCase(createUser.pending, (state) => {
                state.pageStatus = pageStatusVals.loading
            })
            .addCase(createUser.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                const createdUser = _.get(payload, "[0].name", "")
                state.createUserMessage = "User " + createdUser + "created successfully!"
                state.createUserError = null
                // state.pagination.totalResults = payload.totalResults
            })
            .addCase(createUser.rejected, (state, {payload}) => {
                // Create/edit/delete failures surface via each component's own
                // Snackbar (see .unwrap().catch()) - they must not touch
                // getUsersError, which UserTable uses to replace the whole
                // list with an error message.
                state.pageStatus = pageStatusVals.error
                state.createUserError = payload
            })
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.pageStatus = pageStatusVals.fetched
                state.userList = state.userList.filter((user) => user.id !== action.meta.arg)
                state.pagination.totalResults = Math.max(0, state.pagination.totalResults - 1)
            })
            .addCase(deleteUser.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(updateUser.fulfilled, (state, {payload}) => {
                state.pageStatus = pageStatusVals.fetched
                const index = state.userList.findIndex((user) => user.id === payload.id)
                if (index !== -1) {
                    state.userList[index] = payload
                }
            })
            .addCase(updateUser.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
            .addCase(resetUserPassword.fulfilled, (state) => {
                state.pageStatus = pageStatusVals.fetched
            })
            .addCase(resetUserPassword.rejected, (state) => {
                state.pageStatus = pageStatusVals.error
            })
    }
})

export const { changePage, changeLimit, setSearch } = userSlice.actions

// export const selectUsersPayload = (state) => state.users.usersPayload
export const selectUserList = (state) => state.users.userList
export const selectGetUsersError = (state) => state.users.getUsersError
export const selectPageStatus = (state) => state.users.pageStatus
export const selectPagination = (state) => state.users.pagination
export const selectSearch = (state) => state.users.search

export default userSlice.reducer
