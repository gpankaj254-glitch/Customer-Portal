import _ from "lodash"
import { useSelector } from "react-redux"
import { selectUser } from "../auth/authSlice"
import { roles } from "../../consts"
import { bandwidthOptions, productOptions, circuitStatusOptions, circuitChangeTypeOptions } from "../../consts/circuitOptions"

// Shared circuit row-level Actions logic (Edit/Edit Status/Move/Delete) -
// originally only on CircuitTable.js (Site Inventory's nested per-site
// circuit table). "All Actions Available in Live/Changed/Ceased Site
// Inventory - Circuits should also be available to [the matching] Circuit
// Inventory according to that User Access List" - CircuitInventoryTable.js
// (Live/Ceased Circuit Inventory) now reuses this exact same module, so the
// two surfaces can never drift apart on what's allowed or who can do it.

// Circuit row-level Actions permissions.
export function useCircuitRowPermissions() {
    const currentUser = useSelector(selectUser)
    const isAdmin = currentUser.role === roles.SCLOUDX_ADMIN
    // Moving a circuit to another site is open to SCX Admin and SCX User (only
    // the Admin can edit/delete circuits).
    const canMove = isAdmin || currentUser.role === roles.SCLOUDX_USER
    // "Delivery Team Should able to change Circuit Status Under Inventory
    // Module" - SCX Service Delivery gets just this, not the full Edit
    // dialog (still SCX Admin only).
    const isServiceDelivery = currentUser.role === roles.SCLOUDX_SERVICE_DELIVERY
    const canEditStatus = isAdmin || isServiceDelivery
    // "Service Delivery Login, remove change option for Changed and Ceased
    // Circuit" - once a circuit already sits at Changed/Ceased, Service
    // Delivery no longer gets the option to touch its status again (server
    // enforces the same restriction - see updateCircuitStatusById); SCX
    // Admin is unaffected.
    const canEditStatusForRow = (row) =>
        canEditStatus && !(isServiceDelivery && (row.status === "Changed" || row.status === "Ceased"))
    return { isAdmin, canMove, canEditStatus, canEditStatusForRow }
}

// Legacy circuits (imported before the predefined lists existed) can hold a
// bandwidth/product value outside bandwidthOptions/productOptions - include
// it as an extra option so the Edit dropdown doesn't silently blank it out.
export function selectFieldOptions(predefinedOptions, currentValue) {
    const options = [{ value: "", label: "None" }, ...predefinedOptions.map((option) => ({ value: option, label: option }))]
    if (currentValue && !predefinedOptions.includes(currentValue)) {
        options.push({ value: currentValue, label: `${currentValue} (legacy)` })
    }
    return options
}

export function buildEditableFields(circuit) {
    return [
        { name: "vendorCircuitId", label: "Vendor Circuit ID" },
        { name: "customerCircuitId", label: "Customer Circuit ID" },
        { name: "scloudxOrderReference", label: "SCloudX Order Reference" },
        { name: "vendorOrderReference", label: "Vendor Order Reference" },
        { name: "customerOrderReference", label: "Customer Order Reference" },
        { name: "vendorLECName", label: "Vendor LEC Name" },
        {
            name: "bandwidth",
            label: "Bandwidth",
            type: "select",
            options: selectFieldOptions(bandwidthOptions, _.get(circuit, "bandwidth")),
        },
        {
            name: "product",
            label: "Product",
            type: "select",
            options: selectFieldOptions(productOptions, _.get(circuit, "product")),
        },
        { name: "vendorUptime", label: "Vendor Uptime" },
        { name: "vendorMTTR", label: "Vendor MTTR" },
        { name: "customerCircuitBillStartDate", label: "Customer Circuit Bill Start Date" },
        { name: "customerCircuitContractTerm", label: "Customer Circuit Contract Term" },
        { name: "vendorCircuitBillStartDate", label: "Vendor Circuit Bill Start Date" },
        { name: "vendorCircuitContractTerm", label: "Vendor Circuit Contract Term" },
    ]
}

// Fields shown/hidden by the live (in-progress) Status selection itself -
// EditDialog supports `fields` as a function of values for exactly this.
// "Live" needs nothing beyond the Status field itself; plain text dates
// here, not HTML5 date inputs, to match the dd-mm-yyyy string convention
// already used by customerCircuitBillStartDate/vendorCircuitBillStartDate.
// isAdmin defaults false so any other caller that still invokes this with
// just `values` keeps today's behavior - "Give Option to SCX Admin - Add
// change Product and bandwidth" only applies to SCX Admin (not SCX Service
// Delivery, who shares this same Edit Status dialog for a Ceased/Changed
// transition but not the full Edit dialog's other fields).
export function buildStatusEditableFields(values, isAdmin = false) {
    const status = _.get(values, "status", "Live")
    const fields = [
        {
            name: "status",
            label: "Circuit Status",
            type: "select",
            options: circuitStatusOptions.map((option) => ({ value: option, label: option })),
        },
    ]
    if (status === "Ceased") {
        fields.push({ name: "billStopDate", label: "Bill Stop Date (dd-mm-yyyy)" })
    }
    if (status === "Changed") {
        fields.push(
            {
                name: "changeType",
                label: "Change Type",
                type: "select",
                options: [{ value: "", label: "None" }, ...circuitChangeTypeOptions.map((option) => ({ value: option, label: option }))],
            },
            { name: "changeOrderNumber", label: "Change Order Number" },
            { name: "changeDate", label: "Change Date (dd-mm-yyyy)" }
        )
        // A "Changed" circuit is very often an Upgrade/Downgrade - letting
        // SCX Admin record the new Product/Bandwidth right here (instead of
        // a separate Edit afterward) keeps the whole change in one save.
        if (isAdmin) {
            fields.push(
                {
                    name: "product",
                    label: "Product",
                    type: "select",
                    options: selectFieldOptions(productOptions, _.get(values, "product")),
                },
                {
                    name: "bandwidth",
                    label: "Bandwidth",
                    type: "select",
                    options: selectFieldOptions(bandwidthOptions, _.get(values, "bandwidth")),
                }
            )
        }
    }
    return fields
}

export const STATUS_FIELD_NAMES = ["status", "billStopDate", "changeType", "changeOrderNumber", "changeDate", "product", "bandwidth"]
