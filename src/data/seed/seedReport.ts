export interface SeedReport {
    title: string;
    description: string;
    location: { latitude: number; longitude: number };
    address: string | null;
    categoryId: number;
    status: string;
    explanation: string | null;
    assignedToId: number | null;
    images: string[];
}
