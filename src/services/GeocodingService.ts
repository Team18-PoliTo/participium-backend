import axios from "axios";

export class GeocodingService {
    static async getAddress(lat: number, lng: number): Promise<string | null> {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

            const response = await axios.get(url, {
                headers: { "User-Agent": "Participium App - Polito Project" }
            });

            const addr = response.data.address;
            if (!addr) return null;

            const road = addr.road || addr.pedestrian || addr.footway || "";
            const house = addr.house_number || "";

            const looksValidRoad =
                road &&
                !road.match(/^[\d_]/);

            if (looksValidRoad) {
                const line = `${road} ${house}`.trim();
                return line || null;
            }

            return null;
        } catch (error) {
            return null;
        }
    }
}

