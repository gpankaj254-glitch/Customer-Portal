import { createResponseErrorMessage } from "../../utils/responseHandlers"
import axios from "axios"
import { baseURL, headers } from "../../utils/axios"

export async function fetchGetCustomers (data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/customer/get?limit=${data.limit}&page=${data.page}&sortBy=name:asc`, { search: data.search || "" }, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}
export async function fetchCreateCustomer(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/customer/create`, [{ name: data.name }], {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeactivateCustomer(customerId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/customer/${customerId}`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchUpdateCustomer(data, rejectWithValue) {
    try {
        const { customerId, ...updateBody } = data
        const response = await axios.patch(`${baseURL}/customer/${customerId}`, updateBody, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeletedCustomers(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/customer/deleted?limit=${data.limit}&page=${data.page}`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchRestoreCustomer(customerId, rejectWithValue) {
    try {
        const response = await axios.patch(`${baseURL}/customer/${customerId}/restore`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchPermanentlyDeleteCustomer(customerId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/customer/${customerId}/permanent`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}