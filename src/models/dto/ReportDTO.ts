export class BinaryFileDTO {
  filename: string;
  mimetype: string; // e.g. 'image/png'
  size: number; // in bytes
  data: Buffer; // binary content
}

export class AssignedOfficerDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

export class CategoryDTO {
  id: number;
  name: string;
  description?: string;
}

export class ReportDTO {
  id: number;
  citizenId: number;
  title: string;
  description: string;
  category: CategoryDTO;
  photos: string[];
  binaryPhotos: BinaryFileDTO[];
  createdAt: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  status: string;
  explanation?: string | null;
  assignedTo?: AssignedOfficerDTO | null;
}
