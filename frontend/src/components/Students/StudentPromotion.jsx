import React, { useEffect, useState } from 'react';
import API from '../../api/axios';

const DEFAULT_INDIVIDUAL_FORM = {
  studentId: '',
  toYear: 2,
  toSemester: 1,
  academicYearId: '',
};

const DEFAULT_BULK_FORM = {
  department: '',
  fromYear: 1,
  fromSemester: 1,
  toYear: 2,
  toSemester: 1,
  academicYearId: '',
};

export default function StudentPromotion() {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [individualForm, setIndividualForm] = useState(DEFAULT_INDIVIDUAL_FORM);
  const [bulkForm, setBulkForm] = useState(DEFAULT_BULK_FORM);
  const [loading, setLoading] = useState(true);
  const [savingIndividual, setSavingIndividual] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentResponse, departmentResponse, yearResponse] = await Promise.all([
        API.get('/students', { params: { limit: 300 } }),
        API.get('/departments', { params: { active: true } }),
        API.get('/academic/years'),
      ]);

      setStudents(studentResponse?.data?.data?.students || []);
      setDepartments(departmentResponse?.data?.data || []);
      setAcademicYears(yearResponse?.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load promotion data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const submitIndividual = async (event) => {
    event.preventDefault();
    setSavingIndividual(true);
    setError('');
    setMessage('');

    try {
      await API.post('/students/promote', {
        studentIds: [individualForm.studentId],
        toYear: Number(individualForm.toYear),
        toSemester: Number(individualForm.toSemester),
        academicYearId: individualForm.academicYearId || null,
      });

      setMessage('Student promoted successfully.');
      setIndividualForm(DEFAULT_INDIVIDUAL_FORM);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to promote student');
    } finally {
      setSavingIndividual(false);
    }
  };

  const submitBulk = async (event) => {
    event.preventDefault();
    setSavingBulk(true);
    setError('');
    setMessage('');

    try {
      const { data } = await API.post('/students/promote/bulk', {
        department: bulkForm.department || null,
        fromYear: Number(bulkForm.fromYear),
        fromSemester: Number(bulkForm.fromSemester),
        toYear: Number(bulkForm.toYear),
        toSemester: Number(bulkForm.toSemester),
        academicYearId: bulkForm.academicYearId || null,
      });

      setMessage(data?.message || 'Bulk promotion completed.');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed bulk promotion');
    } finally {
      setSavingBulk(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-xl font-semibold text-slate-900">Student Promotions</h2>
        <p className="mt-1 text-sm text-slate-600">Promote students individually or in bulk by cohort.</p>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <h3 className="text-base font-semibold text-slate-900">Individual Promotion</h3>
          <form className="mt-4 grid grid-cols-1 gap-4" onSubmit={submitIndividual}>
            <select
              className="input-field"
              value={individualForm.studentId}
              onChange={(event) =>
                setIndividualForm((previous) => ({ ...previous, studentId: event.target.value }))
              }
              required
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.studentId} - {student.user?.firstName} {student.user?.lastName}
                  {` (Y${student.currentYear}/S${student.currentSemester})`}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-4">
              <input
                className="input-field"
                type="number"
                min={1}
                value={individualForm.toYear}
                onChange={(event) =>
                  setIndividualForm((previous) => ({ ...previous, toYear: event.target.value }))
                }
                placeholder="To Year"
                required
              />
              <input
                className="input-field"
                type="number"
                min={1}
                value={individualForm.toSemester}
                onChange={(event) =>
                  setIndividualForm((previous) => ({ ...previous, toSemester: event.target.value }))
                }
                placeholder="To Semester"
                required
              />
            </div>

            <select
              className="input-field"
              value={individualForm.academicYearId}
              onChange={(event) =>
                setIndividualForm((previous) => ({ ...previous, academicYearId: event.target.value }))
              }
            >
              <option value="">Keep current academic year</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>

            <button type="submit" className="btn-primary" disabled={savingIndividual || loading}>
              {savingIndividual ? 'Promoting...' : 'Promote Student'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-slate-900">Bulk Promotion</h3>
          <form className="mt-4 grid grid-cols-1 gap-4" onSubmit={submitBulk}>
            <select
              className="input-field"
              value={bulkForm.department}
              onChange={(event) =>
                setBulkForm((previous) => ({ ...previous, department: event.target.value }))
              }
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-4">
              <input
                className="input-field"
                type="number"
                min={1}
                value={bulkForm.fromYear}
                onChange={(event) =>
                  setBulkForm((previous) => ({ ...previous, fromYear: event.target.value }))
                }
                placeholder="From Year"
                required
              />
              <input
                className="input-field"
                type="number"
                min={1}
                value={bulkForm.fromSemester}
                onChange={(event) =>
                  setBulkForm((previous) => ({ ...previous, fromSemester: event.target.value }))
                }
                placeholder="From Semester"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                className="input-field"
                type="number"
                min={1}
                value={bulkForm.toYear}
                onChange={(event) =>
                  setBulkForm((previous) => ({ ...previous, toYear: event.target.value }))
                }
                placeholder="To Year"
                required
              />
              <input
                className="input-field"
                type="number"
                min={1}
                value={bulkForm.toSemester}
                onChange={(event) =>
                  setBulkForm((previous) => ({ ...previous, toSemester: event.target.value }))
                }
                placeholder="To Semester"
                required
              />
            </div>

            <select
              className="input-field"
              value={bulkForm.academicYearId}
              onChange={(event) =>
                setBulkForm((previous) => ({ ...previous, academicYearId: event.target.value }))
              }
            >
              <option value="">Keep current academic year</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>

            <button type="submit" className="btn-primary" disabled={savingBulk || loading}>
              {savingBulk ? 'Promoting...' : 'Promote Cohort'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
