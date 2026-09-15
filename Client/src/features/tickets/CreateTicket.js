import * as React from "react"
import CircuitSelectList from "./CircuitSelectList"
import TicketForm from "./TicketForm"

export default function CreateTicket() {
    const [selectedCircuit, setSelectedCircuit] = React.useState(null)

    if (selectedCircuit) {
        return (
            <TicketForm
                circuit={selectedCircuit}
                onBack={() => setSelectedCircuit(null)}
                onDone={() => setSelectedCircuit(null)}
            />
        )
    }

    return <CircuitSelectList onSelectCircuit={setSelectedCircuit} />
}
