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

        // Cleanup on unmount
        return () => {
            if (html5QrCodeRef.current) {
                html5QrCodeRef.current.stop().catch(() => { });
                html5QrCodeRef.current = null;
            }
        };
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
                    ← Back to Management
                </Link>
                <h1>Attendance Station</h1>
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
                    📷 Control
                </button>
                <button
                    className={`scanner-tab ${activeTab === "dashboard" ? "active" : ""}`}
                    onClick={() => {
                        setActiveTab("dashboard");
                        stopScanning();
                        loadDashboard();
                    }}
                >
                    📊 Live Analytics
                </button>
                <button
                    className={`scanner-tab ${activeTab === "audit" ? "active" : ""}`}
                    onClick={() => {
                        setActiveTab("audit");
                        stopScanning();
                        loadDashboard();
                    }}
                >
                    📋 Security Audit
                </button>
            </div>

            {/* Scanner Tab */}
            {activeTab === "scanner" && (
                <div className="scanner-section">
                    <div className="scanner-controls">
                        {!scanning ? (
                            <button onClick={startScanning} className="primary">
                                📷 Start Camera Scan
                            </button>
                        ) : (
                            <button onClick={stopScanning} className="secondary" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
                                ⏹ Stop Scanning
                            </button>
                        )}

                        <div className="file-upload-section">
                            <label className="file-upload-label">
                                📁 Upload Image
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
                            className="secondary"
                        >
                            ✏️ Manual Entry
                        </button>
                    </div>

                    <div id="qr-reader" style={{ width: "100%", maxWidth: "500px", margin: "2rem auto" }} />
                    <div id="qr-reader-file" style={{ display: "none" }} />

                    {/* Manual Override Form */}
                    {showManualOverride && (
                        <div className="manual-override-form premium-card">
                            <h3>Manual Attendance Override</h3>
                            <div className="input-group">
                                <label>Ticket identifier</label>
                                <input
                                    placeholder="Copy-paste the Ticket ID"
                                    value={manualTicketId}
                                    onChange={(e) => setManualTicketId(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <label>Authorization Reason</label>
                                <textarea
                                    placeholder="Why is this being manually scanned?"
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    rows="3"
                                    style={{ marginBottom: 0 }}
                                />
                            </div>
                            <button onClick={handleManualOverride} className="primary full-width" style={{ marginTop: "1rem" }}>
                                Grant Manual Access
                            </button>
                        </div>
                    )}

                    {/* Scan Result */}
                    {scanResult && (
                        <div className="scan-result success">
                            <h3>✅ {scanResult.message}</h3>
                            <div className="scan-details">
                                {scanResult.participant && (
                                    <p>
                                        <strong>Participant:</strong>{" "}
                                        {scanResult.participant.firstName} {scanResult.participant.lastName}
                                    </p>
                                )}
                                <p><strong>Verified At:</strong> {new Date(scanResult.scannedAt).toLocaleString()}</p>
                                {scanResult.isManualOverride && (
                                    <p style={{ color: "var(--warning)", fontWeight: 700 }}>
                                        ⚠️ EXCEPTION GRANTED: {scanResult.overrideReason}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="scan-result error">
                            <h3>❌ Verification Failed</h3>
                            <p>{error}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Dashboard Tab */}
            {activeTab === "dashboard" && dashboard && (
                <div className="dashboard-section animation-fade-in">
                    <div className="dashboard-stats">
                        <div className="stat-card">
                            <div className="stat-value">{dashboard.totalRegistered}</div>
                            <div className="stat-label">Total Registered</div>
                        </div>
                        <div className="stat-card scanned">
                            <div className="stat-value">{dashboard.scannedCount}</div>
                            <div className="stat-label">Successful Entries</div>
                        </div>
                        <div className="stat-card not-scanned">
                            <div className="stat-value">{dashboard.notScannedCount}</div>
                            <div className="stat-label">Pending Entries</div>
                        </div>
                    </div>

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
                            <strong>{dashboard.totalTickets > 0
                                ? `${((dashboard.scannedCount / dashboard.totalTickets) * 100).toFixed(1)}%`
                                : "0%"} Completion</strong> ( {dashboard.scannedCount} / {dashboard.totalTickets} tickets )
                        </div>
                    </div>

                    <div className="export-section">
                        <button onClick={exportAttendanceCSV} className="primary sm">
                            📥 Download Report (.csv)
                        </button>
                        <button onClick={loadDashboard} className="secondary sm">
                            🔄 Sync Data
                        </button>
                    </div>

                    <div className="attendee-section premium-card">
                        <h3>Verified Check-ins</h3>
                        <div className="attendee-list">
                            {dashboard.scanned.length === 0 ? <p className="p-muted">No check-ins recorded yet.</p> :
                                dashboard.scanned.map((a) => (
                                    <div key={a._id} className="attendee-row">
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
                </div>
            )}

            {/* Audit Log Tab */}
            {activeTab === "audit" && dashboard && (
                <div className="audit-section animation-fade-in premium-card">
                    <h3>Security Audit: Manual Exceptions</h3>
                    {dashboard.manualOverrides.length === 0 ? (
                        <div className="empty p-muted">No manual overrides have been authorized for this event.</div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table className="audit-table">
                                <thead>
                                    <tr>
                                        <th>Participant</th>
                                        <th>Ticket ID</th>
                                        <th>Time</th>
                                        <th>Justification</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboard.manualOverrides.map((a) => (
                                        <tr key={a._id}>
                                            <td>{a.participant?.firstName} {a.participant?.lastName}</td>
                                            <td>{a.ticketId}</td>
                                            <td>{new Date(a.scannedAt).toLocaleString()}</td>
                                            <td style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>{a.overrideReason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
