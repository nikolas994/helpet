export const getImageUrl = (record: any) => {
  if (!record.image) return null;

  return `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${record.collectionId}/${record.id}/${record.image}`;
};
