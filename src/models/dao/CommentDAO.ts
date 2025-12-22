import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from "typeorm";
import ReportDAO from "./ReportDAO";
import InternalUserDAO from "./InternalUserDAO";

@Entity("comments")
class CommentDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ type: "text", nullable: false })
  comment: string;

  @ManyToOne(() => InternalUserDAO, (internalUser) => internalUser.comments, {
    nullable: false,
    eager: true,
  })
  comment_owner: InternalUserDAO;
  
  @CreateDateColumn({ type: "datetime" })
  creation_date: Date;

  @ManyToOne(() => ReportDAO, (report) => report.comments, {
    nullable: false,
    onDelete: "CASCADE",
  })
  report: ReportDAO;
}

export default CommentDAO;