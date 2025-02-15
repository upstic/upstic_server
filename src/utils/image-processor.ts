export const processImage = async (file: Express.Multer.File): Promise<Buffer> => {
  // Implementation
  return file.buffer;
}; 