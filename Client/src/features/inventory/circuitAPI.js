import { createResponseErrorMessage } from "../../utils/responseHandlers"
import axios from "axios"
import { baseURL, headers } from "../../utils/axios"

export async function fetchCreateCircuit(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/circuit/create`, [data], {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchUpdateCircuit(data, rejectWithValue) {
    try {
        const { circuitId, ...updateBody } = data
        const response = await axios.patch(`${baseURL}/circuit/${circuitId}`, updateBody, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeactivateCircuit(circuitId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/circuit/${circuitId}`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchDeletedCircuits(data, rejectWithValue) {
    try {
        const response = await axios.post(`${baseURL}/circuit/deleted?limit=${data.limit}&page=${data.page}`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchRestoreCircuit(circuitId, rejectWithValue) {
    try {
        const response = await axios.patch(`${baseURL}/circuit/${circuitId}/restore`, {}, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchPermanentlyDeleteCircuit(circuitId, rejectWithValue) {
    try {
        const response = await axios.delete(`${baseURL}/circuit/${circuitId}/permanent`, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

// Moves a circuit to another site of the same customer (SCX Admin / SCX User).
export async function fetchMoveCircuit(data, rejectWithValue) {
    try {
        const { circuitId, siteId, updateTickets } = data
        const response = await axios.patch(`${baseURL}/circuit/${circuitId}/move`, { siteId, updateTickets }, {headers: headers()})
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

// Sites of one customer, for the "move to another site" picker. Extra keys
// in the /site/get body are used as the Mongo filter, so "customer.id"
// narrows the list; "search" is the usual server-side text search.
export async function fetchSitesOfCustomer(data) {
    try {
        const { customerId, search } = data
        const response = await axios.post(
            `${baseURL}/site/get?limit=200&page=1&sortBy=name:asc`,
            { "customer.id": customerId, search: search || "" },
            {headers: headers()}
        )
        return { results: response.data.results }
    } catch (error) {
        console.error(error)
        return { error: createResponseErrorMessage(error) }
    }
}

// Flat, cross-customer circuit list (not scoped to one site) - used by the
// SCX Finance dashboard table. "search" is the same server-side text search
// used elsewhere (site name, customer name, vendor name, Vendor Circuit ID,
// bill start dates, contract terms, etc).
export async function fetchCircuitsList(data, rejectWithValue) {
    try {
        const { search } = data || {}
        const response = await axios.post(
            `${baseURL}/circuit/get?limit=1000&page=1&sortBy=site.name:asc`,
            { search: search || "" },
            {headers: headers()}
        )
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}

export async function fetchBulkUploadCircuits(file, rejectWithValue) {
    try {
        const formData = new FormData()
        formData.append("file", file)
        const response = await axios.post(`${baseURL}/circuit/bulk-upload`, formData, {
            headers: { ...headers(), "Content-Type": "multipart/form-data" },
        })
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}
