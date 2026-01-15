export class AssignedOfficerDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  companyName?: string;
}

export class CategoryDTO {
  id: number;
  name: string;
  description?: string;
}

export class ReportDTO {
  id: number;
  isAnonymous: boolean;
  citizenId?: number;
  citizenName: string;
  citizenLastName: string;
  title: string;
  description: string;
  category: CategoryDTO;
  photos: string[];
  createdAt: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  address: string | null;
  status: string;
  explanation?: string | null;
  assignedTo?: AssignedOfficerDTO | null;
}
