import store from "./store"
import { login, logout } from "../features/auth/authSlice"
import { setSearch, focusTicket } from "../features/tickets/ticketSlice"
import { setSearch as setUserSearch } from "../features/users/userSlice"
import { togglePage } from "../features/landing/landingSlice"

// A brand-new app's state, captured before anything is dispatched.
const freshState = store.getState()

const signedIn = (role, name) => ({
    type: login.fulfilled.type,
    payload: {
        user: { id: "u1", name, role, customer: { id: "c1", name: "Acme" } },
        tokens: { access: { token: "access" }, refresh: { token: "refresh" } },
    },
})

// What a working session leaves behind: a search term, a selected ticket, a
// page, and lists/dashboard numbers fetched from the server.
function leaveSessionData() {
    store.dispatch(setSearch("A26090014"))
    store.dispatch(focusTicket("A26090014"))
    store.dispatch(setUserSearch("priya"))
    store.dispatch(togglePage("tickets"))
    store.dispatch({ type: "dashboard/fetchSummary/fulfilled", payload: { activeSites: 9, openTickets: 4 } })
    store.dispatch({ type: "dashboard/fetchOpenTicketsAnalysis/fulfilled", payload: { tickets: [{ id: "t1", ticketId: "A26090014" }] } })
}

afterEach(() => {
    store.dispatch({ type: logout.fulfilled.type })
})

test("session data really is left behind before sign-out (sanity check of this test)", () => {
    store.dispatch(signedIn("scloudxAdmin", "SCX Admin"))
    leaveSessionData()
    const state = store.getState()
    expect(state.tickets.search).toBe("A26090014")
    expect(state.landing.page).toBe("tickets")
    expect(state.dashboard.summary).toEqual({ activeSites: 9, openTickets: 4 })
})

test("signing out wipes every slice back to a brand-new app", () => {
    store.dispatch(signedIn("scloudxAdmin", "SCX Admin"))
    leaveSessionData()
    store.dispatch({ type: logout.fulfilled.type })
    expect(store.getState()).toEqual(freshState)
})

test("a failed sign-out call (network/server error) wipes everything as well", () => {
    store.dispatch(signedIn("scloudxAdmin", "SCX Admin"))
    leaveSessionData()
    store.dispatch({ type: logout.rejected.type, payload: "Network Error" })
    // (authSlice sets loginError to "" rather than null on a failed logout - both
    // mean "no error to show", so that one field is normalised for the comparison.)
    const state = store.getState()
    expect({ ...state, auth: { ...state.auth, loginError: null } }).toEqual(freshState)
})

test("the next person to sign in sees none of the previous session", () => {
    store.dispatch(signedIn("scloudxAdmin", "SCX Admin"))
    leaveSessionData()
    store.dispatch({ type: logout.fulfilled.type })
    store.dispatch(signedIn("customerUser", "Daniel"))
    const state = store.getState()
    expect(state.auth.user.name).toBe("Daniel")
    expect(state.auth.isUserLoggedIn).toBe(true)
    expect(state.tickets.search).toBe("")
    expect(state.tickets.focusTicketId).toBe("")
    expect(state.users.search).toBe("")
    expect(state.dashboard.summary).toBeNull()
    expect(state.dashboard.openTicketsAnalysis).toBeNull()
    expect(state.landing.page).toBe("dashboard")
})

test("signing in also starts clean if the previous session never signed out", () => {
    store.dispatch(signedIn("scloudxAdmin", "SCX Admin"))
    leaveSessionData()
    store.dispatch(signedIn("customerUser", "Daniel"))       // no logout in between
    const state = store.getState()
    expect(state.auth.user.name).toBe("Daniel")
    expect(state.tickets.search).toBe("")
    expect(state.dashboard.summary).toBeNull()
    expect(state.landing.page).toBe("dashboard")
})
