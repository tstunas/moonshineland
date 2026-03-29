import { createTrip } from "2ch-trip";

export function createAuthorWithTripcode(author: string) {
    const [name, code] = author.split("#");
    if (code) {
        const tripcode = createTrip(`#${code}`);
        return `${name}<b>${tripcode.trim()}</b>`;
    }
    return name;
}