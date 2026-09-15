
import store from "../app/store"

// CRA only exposes env vars prefixed REACT_APP_, and only at build time - a
// production build needs REACT_APP_API_BASE_URL set before running
// `npm run build` (see .env.example). Falls back to local dev's own
// backend when unset, so local dev needs no setup at all.
export const baseURL = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/v1"

export function headers() {
    const accessToken = store.getState().auth.tokens.access.token
    return {
        Authorization: `Bearer ${accessToken}`
    }
}