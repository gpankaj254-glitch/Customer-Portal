import axios from "axios"
import { createResponseErrorMessage } from "../../utils/responseHandlers"
import { baseURL } from "../../utils/axios"

export async function fetchLogin (data, rejectWithValue) {
    try {
        console.log(data)
        const response = await axios.post(`${baseURL}/auth/login`, data)
        console.log(response)

        return response.data

    } catch (error) {
        console.log(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchLogout (data, rejectWithValue) {
    try {
        console.log(data)
        const response = await axios.post(`${baseURL}/auth/login`, data)
        return response.data
    } catch (error) {
        console.log(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchForgotPassword (email) {
    try {
        const response = await axios.post(`${baseURL}/auth/forgot-password`, { email })
        return { data: response.data }
    } catch (error) {
        return { error: createResponseErrorMessage(error) }
    }
}

export async function fetchResetPassword (token, password) {
    try {
        const response = await axios.post(`${baseURL}/auth/reset-password?token=${encodeURIComponent(token)}`, { password })
        return { data: response.data }
    } catch (error) {
        return { error: createResponseErrorMessage(error) }
    }
}
