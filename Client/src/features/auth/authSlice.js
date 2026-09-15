import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import {fetchLogin, fetchLogout} from "./authAPI"
import getPermissions from "./permissions"
import { loginPageStatusVals} from "./utils"

const initialState = {
    SignInButtonStatus: loginPageStatusVals.idle,
    loginError: null,
    isUserLoggedIn: false,
    user: {},
    tokens: {},
    permisiions: [],
}

export const login = createAsyncThunk(
    "auth/fetchLogin",
    async (data, { rejectWithValue }) => {
        const response = await fetchLogin(data, rejectWithValue)
        return response
    }
)

export const logout = createAsyncThunk(
    "auth/fetchLogout",
    async (data, { rejectWithValue }) => {
        const response = await fetchLogout(data, rejectWithValue)
        return response
    }
)

export const auth = createSlice({
    name: "auth",
    initialState,
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.SignInButtonStatus = loginPageStatusVals.loading
            })
            .addCase(login.fulfilled, (state, {payload}) => {
                state.SignInButtonStatus = loginPageStatusVals.idle
                state.user = payload.user
                state.tokens = payload.tokens
                state.isUserLoggedIn = true
                state.permisiions = getPermissions(payload.user.role)
                state.loginError = null

            })
            .addCase(login.rejected, (state, {payload}) => {
                state.SignInButtonStatus = loginPageStatusVals.idle
                state.loginError = payload
            })
            .addCase(logout.pending, () => {
                // state.status = loginPageStatus.loading
            })
            .addCase(logout.fulfilled, (state) => {
                state.SignInButtonStatus = loginPageStatusVals.idle
                state.isUserLoggedIn = false
            })
            .addCase(logout.rejected, (state) => {
                state.SignInButtonStatus = loginPageStatusVals.idle
                state.isUserLoggedIn = false
                state.loginError = ""
            })
    }
})

export const selectUser = (state) => state.auth.user
export const selectAccessToken = (state) => state.auth.tokens.access
export const selectRefreshToken = (state) => state.auth.tokens.refresh

// export const selectUser = (state) => state.auth.user

export const selectLoginError = (state) => state.auth.loginError
export const selecIsUserLoggedIn = (state) => state.auth.isUserLoggedIn
export const selecPermissions = (state) => state.auth.permisiions

export default auth.reducer
