export function fetchFake() {
    return new Promise((resolve) =>
        setTimeout(() => resolve({ data: "fakeRes" }), 1000)
    )
}
