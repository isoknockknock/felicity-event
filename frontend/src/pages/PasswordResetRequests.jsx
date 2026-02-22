import { useEffect, useState } from "react";
import API from "../services/api";
import "./PasswordResetRequests.css";

export default function PasswordResetRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // "approve" or "reject"
  const [comments, setComments] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await API.get("/password-reset");
      setRequests(res.data);
    } catch (err) {
      setMessage("Failed to load password reset requests.");
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setMessage("");
      const res = await API.post(`/password-reset/${selectedRequest._id}/approve`, {
        comments: comments.trim() || undefined
      });
      setMessage(`Password reset approved! New password: ${res.data.newPassword}`);
      setSelectedRequest(null);
      setActionType(null);
      setComments("");
      fetchRequests();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to approve request.");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      setMessage("");
      await API.post(`/password-reset/${selectedRequest._id}/reject`, {
        comments: comments.trim() || undefined
      });
      setMessage("Password reset rejected.");
      setSelectedRequest(null);
      setActionType(null);
      setComments("");
      fetchRequests();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to reject request.");
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      REQUESTED: "pending",
      APPROVED: "approved",
      REJECTED: "rejected"
    };
    return badges[status] || "unknown";
  };

  const filterRequests = (status) => {
    if (status === "ALL") return requests;
    return requests.filter(r => r.status === status);
  };

  const [filter, setFilter] = useState("ALL");

  if (loading) {
    return <div className="password-reset-center">Loading requests...</div>;
  }

  return (
    <div className="password-reset-container">
      <div className="password-reset-header">
        <h1>Password Reset Requests</h1>
      </div>

      {message && (
        <div className={`password-reset-message ${message.includes("Failed") ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <div className="password-reset-filters">
        <button
          className={filter === "ALL" ? "active" : ""}
          onClick={() => setFilter("ALL")}
        >
          All ({requests.length})
        </button>
        <button
          className={filter === "REQUESTED" ? "active" : ""}
          onClick={() => setFilter("REQUESTED")}
        >
          Pending ({filterRequests("REQUESTED").length})
        </button>
        <button
          className={filter === "APPROVED" ? "active" : ""}
          onClick={() => setFilter("APPROVED")}
        >
          Approved ({filterRequests("APPROVED").length})
        </button>
        <button
          className={filter === "REJECTED" ? "active" : ""}
          onClick={() => setFilter("REJECTED")}
        >
          Rejected ({filterRequests("REJECTED").length})
        </button>
      </div>

      <div className="password-reset-list">
        {filterRequests(filter).length === 0 ? (
          <div className="no-requests">No requests found.</div>
        ) : (
          filterRequests(filter).map((request) => (
            <div
              key={request._id}
              className={`password-reset-item status-${getStatusBadge(request.status)}`}
            >
              <div className="request-info">
                <div className="request-header">
                  <h3>{request.organizer?.name || "Unknown"}</h3>
                  <span className={`status-badge ${getStatusBadge(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                <div className="request-details">
                  <p><strong>Email:</strong> {request.organizer?.email || "—"}</p>
                  <p><strong>Reason:</strong> {request.reason}</p>
                  <p><strong>Requested:</strong> {new Date(request.createdAt).toLocaleString()}</p>
                  {request.adminComments && (
                    <p><strong>Admin Comments:</strong> {request.adminComments}</p>
                  )}
                  {request.status === "APPROVED" && request.updatedAt && (
                    <p><strong>Processed:</strong> {new Date(request.updatedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
              {request.status === "REQUESTED" && (
                <div className="request-actions">
                  <button
                    className="approve-btn"
                    onClick={() => {
                      setSelectedRequest(request);
                      setActionType("approve");
                      setComments("");
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => {
                      setSelectedRequest(request);
                      setActionType("reject");
                      setComments("");
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {selectedRequest && actionType && (
        <div className="modal-overlay" onClick={() => {
          setSelectedRequest(null);
          setActionType(null);
          setComments("");
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>
              {actionType === "approve" ? "Approve Password Reset" : "Reject Password Reset"}
            </h2>
            <div className="modal-info">
              <p><strong>Organizer:</strong> {selectedRequest.organizer?.name}</p>
              <p><strong>Email:</strong> {selectedRequest.organizer?.email}</p>
              <p><strong>Reason:</strong> {selectedRequest.reason}</p>
            </div>
            <div className="modal-form">
              <label>
                Admin Comments (Optional):
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any comments or notes..."
                  rows="4"
                />
              </label>
              {actionType === "approve" && (
                <div className="warning-text">
                  ⚠️ A new temporary password will be generated and displayed after approval.
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button
                className={actionType === "approve" ? "approve-btn" : "reject-btn"}
                onClick={actionType === "approve" ? handleApprove : handleReject}
              >
                {actionType === "approve" ? "Approve" : "Reject"}
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                  setComments("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
