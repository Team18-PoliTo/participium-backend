const originalConsoleLog = console.log;

console.log = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('[MinIO]')) {
    return; 
  }
  originalConsoleLog(...args);
};