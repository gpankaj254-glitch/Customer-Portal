import { combineReducers, configureStore } from "@reduxjs/toolkit"
import logger from "redux-logger"
// import logger from 'redux-logger'
import counterReducer from "../features/counter/counterSlice"
import authReducer, { login, logout } from "../features/auth/authSlice"
import landingReducer from "../features/landing/landingSlice"
import customersReducer from "../features/customers/customerSlice"
import usersReducer from "../features/users/userSlice"
import inventoryReducer from "../features/inventory/inventorySlice"
import ticketsReducer from "../features/tickets/ticketSlice"
import sitesReducer from "../features/sites/siteSlice"
import vendorsReducer from "../features/vendors/vendorSlice"
import circuitsReducer from "../features/inventory/circuitSlice"
import dashboardReducer from "../features/dashboard/dashboardSlice"
import opportunitiesReducer from "../features/opportunities/opportunitySlice"
import deliveryOrdersReducer from "../features/delivery/deliveryOrderSlice"

const appReducer = combineReducers({
    counter: counterReducer,
    auth: authReducer,
    landing: landingReducer,
    users: usersReducer,
    customers: customersReducer,
    inventory: inventoryReducer,
    tickets: ticketsReducer,
    sites: sitesReducer,
    vendors: vendorsReducer,
    circuits: circuitsReducer,
    dashboard: dashboardReducer,
    opportunities: opportunitiesReducer,
    deliveryOrders: deliveryOrdersReducer,
})

// Nothing in this store is saved in the browser - it lives in memory for as
// long as the tab stays open, and signing out doesn't reload the page. Without
// a reset, whoever signs in next in the same tab inherits the previous
// session's lists, search boxes, dashboard numbers, selected ticket and so on
// (and could briefly see another customer's data until fresh data arrives).
// So: signing out wipes every slice back to its initial state, and signing in
// starts every slice except auth from a clean slate too, as a safety net for a
// session that ended without a proper sign-out.
const rootReducer = (state, action) => {
    if (logout.fulfilled.match(action) || logout.rejected.match(action)) {
        return appReducer(undefined, action)
    }
    if (login.fulfilled.match(action) && state) {
        return appReducer({ auth: state.auth }, action)
    }
    return appReducer(state, action)
}

const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger)
})

export default store
