import _ from "lodash"

// One display line for a site's location: address, town (the city), country
// and postal code (zip). Some imported sites already have town/country/postal
// code baked into their address line - only append a part if it isn't already
// present, so the combined text doesn't show it twice. Shared by the Inventory
// list and the Site list so both always read the same.
export function combineAddress (location) {
    const address = _.get(location, "address", "")
    const parts = [address]
    ;[_.get(location, "town", ""), _.get(location, "country", ""), _.get(location, "postalCode", "")].forEach((part) => {
        if (part && !address.toLowerCase().includes(part.toLowerCase())) {
            parts.push(part)
        }
    })
    return parts.filter(Boolean).join(", ")
}
