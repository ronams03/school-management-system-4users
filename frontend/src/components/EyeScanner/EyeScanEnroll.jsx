import React, { useEffect, useState } from 'react';
import { HiCamera, HiLightningBolt } from 'react-icons/hi';
import API from '../../api/axios';
import {
  MIN_ACCEPTED_SCAN_QUALITY,
  useEyeScanner,
} from '../../hooks/useEyeScanner';

const getId = (entity) => entity?.id ?? entity?._id ?? null;

export default function EyeScanEnroll() {
  const [users, setUsers] = useState([]);
  const [enrolledScans, setEnrolledScans] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');

  const {
    videoRef,
    cameraReady,
    cameraError,
    torchSupported,
    torchEnabled,
    isCapturing,
    captureProgress,
    scanQuality,
    statusMessage,
    setStatusMessage,
    startCamera,
    stopCamera,
    setTorch,
    toggleTorch,
    captureScan,
  } = useEyeScanner();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      stopCamera();
      setStatusMessage('');
      return;
    }

    startCamera();
  }, [selectedUser, setStatusMessage, startCamera, stopCamera]);

  useEffect(() => {
    if (!cameraError) return;
    setResult({ success: false, message: cameraError });
  }, [cameraError]);

  const fetchData = async () => {
    try {
      const [usersResponse, scansResponse] = await Promise.all([
        API.get('/admin/users', { params: { limit: 200 } }),
        API.get('/eyescan/enrolled'),
      ]);

      setUsers(usersResponse.data.data.users || []);
      setEnrolledScans(scansResponse.data.data || []);
    } catch (error) {
      console.error(error);
      setResult({ success: false, message: 'Failed to load eye scan records' });
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedUser || submitting || isCapturing) return;

    setResult(null);
    setSubmitting(true);

    const available = await startCamera();
    if (!available) {
      setResult({
        success: false,
        message: 'Camera access is required for enrollment.',
      });
      setSubmitting(false);
      return;
    }

    let autoTorchEnabled = false;

    try {
      if (torchSupported && !torchEnabled) {
        autoTorchEnabled = await setTorch(true);
      }

      const { scanData, quality } = await captureScan();
      if (quality < MIN_ACCEPTED_SCAN_QUALITY) {
        setResult({
          success: false,
          message: `Scan quality is ${quality}%. Improve lighting/focus and retry.`,
        });
        return;
      }

      const { data } = await API.post('/eyescan/enroll', {
        userId: selectedUser,
        scanData,
        eye: 'right',
      });

      setResult({
        success: true,
        message: `Eye scan enrolled successfully. Recorded quality: ${data.data.quality}%`,
      });
      await fetchData();
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.message || 'Enrollment failed',
      });
    } finally {
      if (autoTorchEnabled) {
        await setTorch(false);
      }
      setSubmitting(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove eye scan enrollment?')) return;

    try {
      await API.delete(`/eyescan/${userId}`);
      await fetchData();
    } catch (error) {
      console.error(error);
      setResult({ success: false, message: 'Failed to remove eye scan enrollment' });
    }
  };

  const enrolledUserIds = new Set(
    enrolledScans
      .map((scan) => String(getId(scan.user) || ''))
      .filter(Boolean),
  );

  const filteredUsers = users.filter((user) => (
    !enrolledUserIds.has(String(getId(user) || ''))
    && ['student', 'teacher'].includes(user.role)
    && (search === '' || `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(search.toLowerCase()))
  ));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Eye Scan Enrollment</h1>
        <p className="text-gray-500 mt-1">Register users&apos; iris patterns for biometric attendance</p>
      </div>

      {loading && (
        <div className="card">
          <p className="text-sm text-gray-600">Loading enrollment data...</p>
        </div>
      )}

      {result && (
        <div className={`p-4 rounded-xl border ${result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {result.message}
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Enroll New User</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search User</label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
              <select
                value={selectedUser}
                onChange={(event) => setSelectedUser(event.target.value)}
                className="input-field"
                size={6}
              >
                {filteredUsers.map((user) => (
                  <option key={getId(user)} value={getId(user)}>
                    {user.firstName} {user.lastName} ({user.role}) - {user.email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {filteredUsers.length} users available for enrollment
              </p>
            </div>

            <button
              onClick={handleEnroll}
              disabled={!selectedUser || submitting || isCapturing}
              className="btn-primary w-full py-3"
            >
              {isCapturing ? 'Capturing...' : submitting ? 'Saving...' : 'Start Eye Scan Enrollment'}
            </button>

            {!cameraReady && selectedUser && (
              <button
                onClick={startCamera}
                className="w-full py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Enable Camera
              </button>
            )}

            {torchSupported && cameraReady && selectedUser && (
              <button
                onClick={toggleTorch}
                disabled={isCapturing}
                className="w-full py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-70"
              >
                <span className="inline-flex items-center gap-1">
                  <HiLightningBolt className="w-4 h-4" />
                  {torchEnabled ? 'Turn Light Off' : 'Turn Light On'}
                </span>
              </button>
            )}

            {!torchSupported && cameraReady && selectedUser && (
              <p className="text-[11px] text-gray-500">
                Flashlight is unavailable on this device/browser. For better quality, use brighter ambient light.
              </p>
            )}
          </div>

          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-primary-200 bg-slate-900">
              {selectedUser ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-300">
                  <HiCamera className="w-16 h-16 opacity-50" />
                </div>
              )}

              <div className="absolute inset-3 rounded-full border border-primary-200/60 pointer-events-none" />

              {isCapturing && (
                <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 scan-line" />
                </div>
              )}

              {selectedUser && !cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 text-white text-xs text-center px-4">
                  <span className="inline-flex items-center gap-2">
                    <HiCamera className="w-4 h-4" /> Starting camera...
                  </span>
                </div>
              )}
            </div>

            {!selectedUser && (
              <p className="text-sm text-gray-500 text-center">
                Select a user first to start real camera eye scan enrollment.
              </p>
            )}

            {statusMessage && (
              <p className="text-xs text-center text-gray-500">{statusMessage}</p>
            )}

            {isCapturing && (
              <div className="w-full max-w-xs space-y-1">
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${captureProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-center text-gray-500">Frame capture progress {captureProgress}%</p>
              </div>
            )}

            {scanQuality > 0 && (
              <p className="text-xs text-center text-gray-600">
                Last capture quality: <span className="font-semibold">{scanQuality}%</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Enrolled Users ({enrolledScans.length})</h3>
          <span className="badge-green">{enrolledScans.filter((scan) => scan.isActive).length} Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">User</th>
                <th className="table-header">Role</th>
                <th className="table-header">Quality</th>
                <th className="table-header">Enrolled Date</th>
                <th className="table-header">Last Used</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {enrolledScans.map((scan) => (
                <tr key={getId(scan)} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-700">
                        {scan.user?.firstName?.[0]}{scan.user?.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{scan.user?.firstName} {scan.user?.lastName}</p>
                        <p className="text-xs text-gray-500">{scan.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="badge-blue capitalize">{scan.user?.role}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${scan.quality >= 90 ? 'bg-emerald-500' : scan.quality >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${scan.quality}%` }}
                        />
                      </div>
                      <span className="text-xs">{scan.quality}%</span>
                    </div>
                  </td>
                  <td className="table-cell text-sm">
                    {new Date(scan.enrollmentDate).toLocaleDateString()}
                  </td>
                  <td className="table-cell text-sm">
                    {scan.lastUsed ? new Date(scan.lastUsed).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="table-cell">
                    <span className={scan.isActive ? 'badge-green' : 'badge-red'}>
                      {scan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => handleRemove(getId(scan.user))}
                      className="text-xs btn-danger py-1 px-2"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}

              {enrolledScans.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No eye scans enrolled yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
