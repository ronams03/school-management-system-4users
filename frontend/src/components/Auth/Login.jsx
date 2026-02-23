import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiCamera,
  HiEye,
  HiEyeOff,
  HiLightningBolt,
  HiLockClosed,
  HiMail,
} from 'react-icons/hi';
import { useAuth } from '../../hooks/useAuth';
import {
  MIN_ACCEPTED_SCAN_QUALITY,
  useEyeScanner,
} from '../../hooks/useEyeScanner';

export default function Login() {
  const [mode, setMode] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const { login, loginWithEyeScan } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (mode !== 'eyescan') {
      stopCamera();
      return;
    }

    startCamera();
  }, [mode, startCamera, stopCamera]);

  useEffect(() => {
    if (!cameraError) return;
    setError(cameraError);
  }, [cameraError]);

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEyeScanLogin = async () => {
    setError('');

    const available = await startCamera();
    if (!available) {
      setError('Camera access is required for eye scan login.');
      return;
    }

    let autoTorchEnabled = false;

    try {
      if (torchSupported && !torchEnabled) {
        autoTorchEnabled = await setTorch(true);
      }

      const { scanData, quality } = await captureScan();
      if (quality < MIN_ACCEPTED_SCAN_QUALITY) {
        setError(`Scan quality is ${quality}%. Please improve lighting and try again.`);
        return;
      }

      await loginWithEyeScan(scanData);
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Eye scan authentication failed');
    } finally {
      if (autoTorchEnabled) {
        await setTorch(false);
      }
    }
  };

  const handleModeChange = (nextMode) => {
    setError('');
    setStatusMessage('');
    setMode(nextMode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <HiEye className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">EyeTrack</h1>
          <p className="text-primary-200 mt-2">School Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => handleModeChange('password')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'password'
                  ? 'bg-white shadow-sm text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => handleModeChange('eyescan')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'eyescan'
                  ? 'bg-white shadow-sm text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Eye Scan
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <HiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="input-field pl-10"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input-field pl-10 pr-10"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-base"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="relative w-56 h-56 mx-auto rounded-full overflow-hidden border-4 border-primary-200 bg-slate-900">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover scale-x-[-1]"
                />
                <div className="absolute inset-3 rounded-full border border-primary-200/60 pointer-events-none" />
                {isCapturing && (
                  <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                    <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 scan-line" />
                  </div>
                )}
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 text-white text-xs text-center px-6">
                    <span className="inline-flex items-center gap-2">
                      <HiCamera className="w-4 h-4" /> Starting camera...
                    </span>
                  </div>
                )}
              </div>

              {statusMessage && (
                <p className="text-xs text-center text-gray-500">{statusMessage}</p>
              )}

              {isCapturing && (
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${captureProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-center text-gray-500">Capturing frame set {captureProgress}%</p>
                </div>
              )}

              {scanQuality > 0 && (
                <p className="text-xs text-center text-gray-600">
                  Last scan quality: <span className="font-semibold">{scanQuality}%</span>
                </p>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleEyeScanLogin}
                  disabled={isCapturing}
                  className="btn-primary w-full py-3 text-base"
                >
                  {isCapturing ? 'Scanning...' : 'Start Eye Scan'}
                </button>

                {!cameraReady && (
                  <button
                    onClick={startCamera}
                    className="w-full py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Enable Camera
                  </button>
                )}

                {torchSupported && cameraReady && (
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

                {!torchSupported && cameraReady && (
                  <p className="text-[11px] text-center text-gray-500">
                    Flashlight is not exposed by this device/browser. Use a brighter room for better scans.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { role: 'Admin', email: 'admin@school.com' },
                { role: 'Head', email: 'head@school.com' },
                { role: 'Teacher', email: 'teacher@school.com' },
                { role: 'Student', email: 'student@school.com' },
              ].map((credential) => (
                <button
                  key={credential.role}
                  onClick={() => {
                    setEmail(credential.email);
                    setPassword('password123');
                    handleModeChange('password');
                  }}
                  className="px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors text-left"
                >
                  <span className="font-medium">{credential.role}</span>
                  <br />
                  <span className="text-gray-400">{credential.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
