/* istanbul ignore file */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("temp_files")
class TempFileDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ nullable: false, unique: true })
  fileId: string; // UUID for external reference

  @Column({ nullable: false })
  originalName: string;

  @Column({ nullable: false })
  tempPath: string; // MinIO path: temp/{fileId}/{filename}

  @Column({ nullable: false })
  size: number; // File size in bytes

  @Column({ nullable: false })
  mimeType: string; // e.g., 'image/jpeg'

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: false })
  expiresAt: Date; // Temp files expire after 24 hours
}

export default TempFileDAO;
