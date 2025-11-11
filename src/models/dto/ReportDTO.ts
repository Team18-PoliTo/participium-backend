export class BinaryFileDTO {
  filename: string;
  mimetype: string; // e.g. 'image/png'
  size: number; // in bytes
  data: Buffer; // binary content
}

export class ReportDTO {
  id: number;
  citizenId: number;
  title: string;
  description: string;
  category: string;
  photos: string[];
  binaryPhotos: BinaryFileDTO[];
  createdAt: Date;
  location: {
    latitude: number;
    longitude: number;
  };
}
