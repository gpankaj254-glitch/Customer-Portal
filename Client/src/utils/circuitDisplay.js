import { getFormattedStoredDate } from "./dates"

// Shared by CircuitInventoryTable.js (Live/Ceased Circuit Inventory tabs)
// and InventoryTable.js's CSV export (Live/Changed/Ceased Site Inventory
// tabs) so both build the exact same "Circuit Inventory" CSV shape
// regardless of which tab it's downloaded from.

// "Circuit Status Date" - the single date that matters for a circuit's
// current status: Live reuses its Customer Bill Start Date (there's no
// separate "went Live" date captured), Ceased uses Bill Stop Date, Changed
// uses Change Date - same mapping as CircuitTable.js's own
// formatCircuitStatus, just split out as its own column here instead of
// folded into one combined status string.
export function getCircuitStatusDate(circuit) {
    if (circuit.status === "Ceased") {
        return circuit.billStopDate
    }
    if (circuit.status === "Changed") {
        return circuit.changeDate
    }
    return circuit.customerCircuitBillStartDate
}

// "If Circuit Status is Ceased, Display Change Type - 'Customer Cease', if
// Circuit type is Changed, Display -'Change Type + Change Order Number'" - a
// Ceased circuit has no changeType of its own (that field's only ever set
// on a Changed circuit), so it gets this fixed label instead of a blank
// value; a Changed circuit shows its actual Change Type alongside its
// Change Order Number.
export function getCircuitChangeTypeDisplay(circuit) {
    if (circuit.status === "Ceased") {
        return "Customer Cease"
    }
    if (circuit.status === "Changed") {
        return [circuit.changeType, circuit.changeOrderNumber].filter(Boolean).join(" - ")
    }
    return ""
}

// The standard "Circuit Inventory" CSV row/column shape - every download
// button across Inventory Management (both circuit-centric and site-
// centric tabs) and the CSV columns it lines up with. `changeType` is left
// out unless includeChangeType is set (only meaningful once a circuit has
// actually Changed - the plain Live export omits it, same as
// CircuitInventoryTable's showChangeType prop).
export function circuitCsvColumns(includeChangeType) {
    const columns = [
        { id: "customerName", label: "Customer Name" },
        { id: "scloudxOrderReference", label: "SCX Order Ref Number" },
        { id: "customerOrderReference", label: "Customer PO Number" },
        { id: "product", label: "Product" },
        { id: "bandwidth", label: "Bandwidth" },
        { id: "vendorName", label: "Vendor Name" },
        { id: "address", label: "Address" },
        { id: "status", label: "Circuit Status" },
    ]
    if (includeChangeType) {
        columns.push({ id: "changeType", label: "Change Type" })
    }
    columns.push({ id: "statusDate", label: "Circuit Status Date" })
    return columns
}

// customerName/address are already resolved by the caller (they come from
// a Site, not the Circuit itself - CircuitInventoryTable's rows carry
// customer.name/location directly, InventoryTable's come from the parent
// Site row), so this only fills in the fields that live on the circuit.
export function buildCircuitCsvRow(circuit, { customerName, address, vendorName }) {
    return {
        customerName: customerName || "",
        scloudxOrderReference: circuit.scloudxOrderReference || "",
        customerOrderReference: circuit.customerOrderReference || "",
        product: circuit.product || "",
        bandwidth: circuit.bandwidth || "",
        vendorName: vendorName || "",
        address: address || "",
        status: circuit.status || "Live",
        changeType: getCircuitChangeTypeDisplay(circuit),
        statusDate: getFormattedStoredDate(getCircuitStatusDate(circuit)),
    }
}
