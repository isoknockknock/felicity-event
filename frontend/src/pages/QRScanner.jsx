import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import API from "../services/api";
import "./QRScanner.css";

export default function QRScanner() {
    const { eventId } = useParams();
    const [event, setEvent] = useState(null);
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState("");
    const [scanning, setScanning] = useState(false);
    const [dashboard, setDashboard] = useState(null);
    const [manualTicketId, setManualTicketId] = useState("");
    const [overrideReason, setOverrideReason] = useState("");
    const [showManualOverride, setShowManualOverride] = useState(false);
    const [activeTab, setActiveTab] = useState("scanner");
    const html5QrCodeRef = useRef(null);

    const loadDashboard = useCallback(async () => {
        try {
            const res = await API.get(`/attendance/${eventId}/dashboard`);
            setDashboard(res.data);
        } catch {
            console.error("Failed to load attendance dashboard");
        }
    }, [eventId]);

    useEffect(() => {
        API.get(`/events/${eventId}`)
            .then((res) => setEvent(res.data))
            .catch(() => { });
        loadDashboard();
    }, [eventId, loadDashboard]);

    const startScanning = async () => {
        try {
            setError("");
            setScanResult(null);
            setScanning(true);

            const html5QrCode = new Html5Qrcode("qr-reader");
            html5QrCodeRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                async (decodedText) => {
                    await html5QrCode.stop();
                    html5QrCodeRef.current = null;
                    setScanning(false);
                    handleScanResult(decodedText);
                },
                () => { } // Ignore failures
            );
        } catch (err) {
            setScanning(false);
            setError("Camera access denied or not available. Try file upload or manual entry.");
        }
    };

    const stopScanning = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
            } catch { }
            html5QrCodeRef.current = null;
        }
        setScanning(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setError("");
            setScanResult(null);

            const html5QrCode = new Html5Qrcode("qr-reader-file");
            const result = await html5QrCode.scanFile(file, true);
            handleScanResult(result);
            html5QrCode.clear();
        } catch (err) {
            setError("Could not read QR code from image. Try again.");
        }
    };

    const handleScanResult = async (decodedText) => {
        try {
            let ticketId;
            try {
                const parsed = JSON.parse(decodedText);
                ticketId = parsed.ticketId;
            } catch {
                ticketId = decodedText.trim();
            }

            if (!ticketId) {
                setError("Invalid QR code data");
                return;
            }

            const res = await API.post("/attendance/scan", { ticketId });
            setScanResult(res.data);
            setError("");
            loadDashboard();
        } catch (err) {
            setError(err.response?.data?.message || "Scan failed");
            setScanResult(null);
        }
    };

    const handleManualOverride = async () => {
        if (!manualTicketId.trim() || !overrideReason.trim()) {
            setError("Ticket ID and reason are required for manual override");
            return;
        }

        try {
            const res = await API.post("/attendance/manual-override", {
                ticketId: manualTicketId.trim(),
                reason: overrideReason.trim(),
            });
            setScanResult(res.data);
            setError("");
            setManualTicketId("");
            setOverrideReason("");
            setShowManualOverride(false);
            loadDashboard();
        } catch (err) {
            setError(err.response?.data?.message || "Manual override failed");
        }
    };

    const exportAttendanceCSV = () => {
        window.open(
            `http://localhost:5000/api/attendance/${eventId}/export`,
            "_blank"
        );
    };

    return (
        <div className="qr-scanner-container">
            <div className="qr-scanner-header">
                <Link to={`/organizer/events/${eventId}`} className="back-link">
                    ← Back to Event
                </Link>
                <h1>QR Scanner & Attendance</h1>
                {event && <div className="event-name">{event.name}</div>}
            </div>

            {/* Tabs */}
            <div className="scanner-tabs">
                <button
                    className={`scanner-tab ${activeTab === "scanner" ? "active" : ""}`}
                    onClick={() => {
                        setActiveTab("scanner");
                        stopScanning();
                    }}
                >
                    📷 Scanner
                </button>
                <button
                    className={`scanner-tab ${activeTab === "dashboard" ? "active" : ""}`}
                    onClick={() => {
                        setActiveTab("dashboard");
                        stopScanning();
                        loadDashboard();
                    }}
                >
                    📊 Live Dashboard
                </button>
                <button
                    className={`scanner-tab ${activeTab === "audit" ? "active" : ""}`}
                    onClick={() => {
                        setActiveTab("audit");
                        stopScanning();
                        loadDashboard();
                    }}
                >
                    📋 Audit Log
                </button>
            </div>

            {/* Scanner Tab */}
            {activeTab === "scanner" && (
                <div className="scanner-section">
                    <div className="scanner-controls">
                        {!scanning ? (
                            <button onClick={startScanning} className="scan-btn">
                                📷 Start Camera Scan
                            </button>
                        ) : (
                            <button onClick={stopScanning} className="stop-btn">
                                ⏹ Stop Scanning
                            </button>
                        )}

                        <div className="file-upload-section">
                            <label className="file-upload-label">
                                📁 Upload QR Image
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    style={{ display: "none" }}
                                />
                            </label>
                        </div>

                        <button
                            onClick={() => setShowManualOverride(!showManualOverride)}
                            className="manual-btn"
                        >
                            ✏️ Manual Override
                        </button>
                    </div>

                    <div id="qr-reader" style={{ width: "100%", maxWidth: "400px", margin: "1rem auto" }} />
                    <div id="qr-reader-file" style={{ display: "none" }} />

                    {/* Manual Override Form */}
                    {showManualOverride && (
                        <div className="manual-override-form">
                            <h3>Manual Attendance Override</h3>
                            <input
                                placeholder="Ticket ID"
                                value={manualTicketId}
                                onChange={(e) => setManualTicketId(e.target.value)}
                                className="scanner-input"
                            />
                            <textarea
                                placeholder="Reason for manual override (required for audit)"
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                                className="scanner-textarea"
                                rows="3"
                            />
                            <button onClick={handleManualOverride} className="override-submit-btn">
                                Submit Override
                            </button>
                        </div>
                    )}

                    {/* Scan Result */}
                    {scanResult && (
                        <div className="scan-result success">
                            <h3>✅ {scanResult.message}</h3>
                            {scanResult.participant && (
                                <p>
                                    <strong>Participant:</strong>{" "}
                                    {scanResult.participant.firstName} {scanResult.participant.lastName}
                                </p>
                            )}
                            <p>
                                <strong>Event:</strong> {scanResult.event}
                            </p>
                            <p>
                                <strong>Scanned At:</strong>{" "}
                                {new Date(scanResult.scannedAt).toLocaleString()}
                            </p>
                            {scanResult.isManualOverride && (
                                <p>
                                    <strong>⚠️ Manual Override</strong> — Reason: {scanResult.overrideReason}
                                </p>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="scan-result error">
                            <h3>❌ {error}</h3>
                        </div>
                    )}
                </div>
            )}

            {/* Dashboard Tab */}
            {activeTab === "dashboard" && dashboard && (
                <div className="dashboard-section">
                    <div className="dashboard-stats">
                        <div className="stat-card">
                            <div className="stat-value">{dashboard.totalRegistered}</div>
                            <div className="stat-label">Registered</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{dashboard.totalTickets}</div>
                            <div className="stat-label">Tickets</div>
                        </div>
                        <div className="stat-card scanned">
                            <div className="stat-value">{dashboard.scannedCount}</div>
                            <div className="stat-label">Scanned</div>
                        </div>
                        <div className="stat-card not-scanned">
                            <div className="stat-value">{dashboard.notScannedCount}</div>
                            <div className="stat-label">Not Scanned</div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="progress-container">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{
                                    width: `${dashboard.totalTickets > 0 ? (dashboard.scannedCount / dashboard.totalTickets) * 100 : 0}%`,
                                }}
                            />
                        </div>
                        <div className="progress-text">
                            {dashboard.totalTickets > 0
                                ? `${((dashboard.scannedCount / dashboard.totalTickets) * 100).toFixed(1)}%`
                                : "0%"}{" "}
                            attended
                        </div>
                    </div>

                    <div className="export-section">
                        <button onClick={exportAttendanceCSV} className="export-btn">
                            📥 Export Attendance CSV
                        </button>
                        <button onClick={loadDashboard} className="refresh-btn">
                            🔄 Refresh
                        </button>
                    </div>

                    {/* Scanned list */}
                    <div className="attendee-section">
                        <h3>✅ Scanned ({dashboard.scannedCount})</h3>
                        <div className="attendee-list">
                            {dashboard.scanned.map((a) => (
                                <div key={a._id} className="attendee-row scanned">
                                    <div>
                                        <strong>{a.participant?.firstName} {a.participant?.lastName}</strong>
                                        <div className="attendee-email">{a.participant?.email}</div>
                                    </div>
                                    <div className="attendee-meta">
                                        <span className="ticket-badge">{a.ticketId}</span>
                                        <span className="time">{new Date(a.scannedAt).toLocaleTimeString()}</span>
                                        {a.isManualOverride && <span className="override-badge">Manual</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Not scanned list */}
                    <div className="attendee-section">
                        <h3>⏳ Not Yet Scanned ({dashboard.notScannedCount})</h3>
                        <div className="attendee-list">
                            {dashboard.notScanned.map((t) => (
                                <div key={t._id} className="attendee-row not-scanned">
                                    <div>
                                        <strong>{t.participant?.firstName} {t.participant?.lastName}</strong>
                                        <div className="attendee-email">{t.participant?.email}</div>
                                    </div>
                                    <span className="ticket-badge">{t.ticketId}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Log Tab */}
            {activeTab === "audit" && dashboard && (
                <div className="audit-section">
                    <h3>📋 Manual Override Audit Log</h3>
                    {dashboard.manualOverrides.length === 0 ? (
                        <div className="empty">No manual overrides recorded.</div>
                    ) : (
                        <table className="audit-table">
                            <thead>
                                <tr>
                                    <th>Participant</th>
                                    <th>Ticket ID</th>
                                    <th>Time</th>
                                    <th>Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboard.manualOverrides.map((a) => (
                                    <tr key={a._id}>
                                        <td>{a.participant?.firstName} {a.participant?.lastName}</td>
                                        <td>{a.ticketId}</td>
                                        <td>{new Date(a.scannedAt).toLocaleString()}</td>
                                        <td>{a.overrideReason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
