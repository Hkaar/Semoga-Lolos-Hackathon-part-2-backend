/**
 * Reverse geocode lat/lng → "City, Country" string
 * Uses Nominatim (OpenStreetMap) — free, no API key needed
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'User-Agent': 'klimabot/1.0' } }
        );
        const data = await res.json();
        const city = data.address?.city 
            || data.address?.town 
            || data.address?.village 
            || data.address?.county 
            || '';
        const country = data.address?.country || '';
        return [city, country].filter(Boolean).join(', ');
    } catch {
        return '';
    }
}