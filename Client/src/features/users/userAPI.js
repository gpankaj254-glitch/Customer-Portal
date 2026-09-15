import axios from "axios"
import { createResponseErrorMessage } from "../../utils/responseHandlers"

import { baseURL, headers } from "../../utils/axios"

export async function fetchCreateUser (data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/user/`, data, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchGetUsers (data, rejectWithValue) {
    try {
        const search = encodeURIComponent(data.search || "")
        const response = await axios.get(`${baseURL}/user?limit=${data.limit}&page=${data.page}&search=${search}&sortBy=name:asc`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeleteUser (userId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/user/${userId}`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchUpdateUser (data, rejectWithValue) {
    try {
        const { userId, ...updateBody } = data
        const response = await axios.patch(`${baseURL}/user/${userId}`, updateBody, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeletedUsers (data, rejectWithValue) {
    try {
        const response = await axios.get(`${baseURL}/user/deleted?limit=${data.limit}&page=${data.page}`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchResetUserPassword (data, rejectWithValue) {
    try {
        const { userId, password } = data
        const response = await axios.patch(`${baseURL}/user/${userId}/reset-password`, { password }, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchRestoreUser (userId, rejectWithValue) {
    try {
        const response = await axios.patch(`${baseURL}/user/${userId}/restore`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchPermanentlyDeleteUser (userId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/user/${userId}/permanent`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

// export async function fetchCreateUser (data, rejectWithValue) {
// 	try {
// 		const response = await axios.post(`http://localhost:8000/v1/user?limit=${data.limit}&page=${data.page}`)
// 		return response.data
// 	} catch (error) {
// 		console.error(error)
// 		return rejectWithValue(createResponseErrorMessage(error), {})
// 	}
// }

// export async function fetchLogout (data, rejectWithValue) {
// 	try {
// 		console.log(data)
// 		const response = await axios.post("http://localhost:8000/v1/auth/logout", data)
// 		return response.data
// 	} catch (error) {
// 		console.log(error)
// 		return rejectWithValue(createResponseErrorMessage(error), {})
// 	}
// }
