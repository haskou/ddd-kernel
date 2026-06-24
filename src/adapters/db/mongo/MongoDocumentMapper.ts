export interface MongoDocumentMapper<
  TEntity,
  TDocument extends { id: TId },
  TId,
> {
  toDocument(entity: TEntity): TDocument;
  toEntity(document: TDocument): TEntity;
}
