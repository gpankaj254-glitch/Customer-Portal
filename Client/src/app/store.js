import { configureStore } from "@reduxjs/toolkit"
import logger from "redux-logger"
// import logger from 'redux-logger'
import counterReducer from "../features/counter/counterSlice"
import authReducer from "../features/auth/authSlice"
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

const store = configureStore({
    reducer: {
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

    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger)
})

export default store
