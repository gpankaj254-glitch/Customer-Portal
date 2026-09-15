import {createSlice } from "@reduxjs/toolkit"
import { login } from "../auth/authSlice"

const initialState = {
    page: "dashboard",
    status: "idle"
}

export const landingSlice = createSlice({
    name: "landing",
    initialState,
    reducers: {
        togglePage: (state, action) => {
            // console.log("togglePage")
            state.page = action.payload
        }
    },
    extraReducers: (builder) => {
        // Redux state persists across a logout/login within the same tab -
        // without this, logging back in after navigating away from
        // Dashboard would land back on whatever page was last open instead
        // of Dashboard.
        builder.addCase(login.fulfilled, (state) => {
            state.page = "dashboard"
        })
    },
})

export const { togglePage } = landingSlice.actions

export const selectPage = (state) => state.landing.page

export default landingSlice.reducer