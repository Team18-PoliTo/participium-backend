// Manual mock for FileService
// Jest will automatically use this when jest.mock() is called
const mockValidateTempFiles = jest.fn();
const mockMoveMultipleToPermanent = jest.fn();

export default {
  validateTempFiles: mockValidateTempFiles,
  moveMultipleToPermanent: mockMoveMultipleToPermanent,
  uploadTemp: jest.fn(),
  deleteTempFile: jest.fn(),
};

