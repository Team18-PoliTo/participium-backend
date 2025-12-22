export class CommentMapper {
  static toDTO(commentDAO: any): any {
    const commentDTO: any = new Object();
    commentDTO.id = commentDAO.id;
    commentDTO.comment = commentDAO.comment;
    commentDTO.commentOwner_id = commentDAO.comment_owner.id;
    commentDTO.creation_date = commentDAO.creation_date;
    commentDTO.report_id = commentDAO.report.id;
    return commentDTO;
  }
}
