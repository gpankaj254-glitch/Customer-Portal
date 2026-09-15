import { createResponseErrorMessage } from "../../utils/responseHandlers"
import axios from "axios"
import { baseURL, headers } from "../../utils/axios"

export async function fetchGetSites (data, rejectWithValue) {

    try {
        const response = await axios.post(`${baseURL}/site/get?limit=${data.limit}&page=${data.page}&sortBy=name:asc`, { search: data.search || "" }, {headers: headers()})
        console.log("res:" + response)
        return response.data
    } catch (error) {
        console.error(error)
        return rejectWithValue(createResponseErrorMessage(error), {})
    }
}