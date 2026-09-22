import { createResponseErrorMessage } from "../../utils/responseHandlers"
import axios from "axios"
import { baseURL, headers } from "../../utils/axios"

export async function fetchCreateDeliveryOrder(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/delivery-order/create`, data, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

// tab: "open" or "completed" - the server builds the actual Status filter
// from this (see deliveryOrder.controller.js). It has to be a plain string,
// not a Mongo operator object like { $ne: "Completed" }: express-mongo-
// sanitize strips any $-prefixed key from the request body, which would
// silently empty an operator object out before it reached the query.
export async function fetchGetDeliveryOrders(data, rejectWithValue) {
    try {
        const response = await axios.post(
            `${baseURL}/delivery-order/get?limit=${data.limit}&page=${data.page}&sortBy=orderDate:desc`,
            { search: data.search || "", tab: data.tab },
            { headers: headers() }
        )
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchUpdateDeliveryOrder(data, rejectWithValue) {
    try {
        const { deliveryOrderId, ...updateBody } = data
        const response = await axios.patch(`${baseURL}/delivery-order/${deliveryOrderId}`, updateBody, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeactivateDeliveryOrder(deliveryOrderId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/delivery-order/${deliveryOrderId}`, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeletedDeliveryOrders(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/delivery-order/deleted?limit=${data.limit}&page=${data.page}`, {}, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchRestoreDeliveryOrder(deliveryOrderId, rejectWithValue) {
    try {
        const response = await axios.patch(`${baseURL}/delivery-order/${deliveryOrderId}/restore`, {}, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchPermanentlyDeleteDeliveryOrder(deliveryOrderId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/delivery-order/${deliveryOrderId}/permanent`, { headers: headers() })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchBulkUploadDeliveryOrders(file, rejectWithValue) {
    try {
        const formData = new FormData()
        formData.append("file", file)
        const response = await axios.post(`${baseURL}/delivery-order/bulk-upload`, formData, {
            headers: { ...headers(), "Content-Type": "multipart/form-data" },
        })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}
