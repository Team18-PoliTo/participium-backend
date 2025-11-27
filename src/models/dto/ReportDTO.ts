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
  citizenName: string;
  citizenSurname: string;
  title: string;
  description: string;
  category: CategoryDTO;
  photos: string[];
  createdAt: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  status: string;
  explanation?: string | null;
  assignedTo?: AssignedOfficerDTO | null;
}

