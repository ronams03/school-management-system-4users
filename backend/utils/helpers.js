export const generateStudentId = (departmentCode, year) => {
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `STU-${departmentCode}-${year}-${random}`;
};

export const generateTeacherId = (departmentCode) => {
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TCH-${departmentCode}-${random}`;
};

export const paginateResults = (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return { skip, limit: parseInt(limit) };
};