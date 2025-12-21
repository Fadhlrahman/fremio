import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import paymentService from "../services/paymentService";

const SubscriptionRoute = ({ children }) => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const response = await paymentService.getAccess();
        if (response.success && response.hasAccess) {
          setHasAccess(true);
        }
      } catch (error) {
        console.error("Check access error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [currentUser]);

  // If not logged in or no access, redirect to pricing page
  if (!currentUser || (!loading && !hasAccess)) {
    return <Navigate to="/pricing" replace />;
  }

  // Show loading spinner while checking access
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              border: "5px solid #f3f3f3",
              borderTop: "5px solid #E0B7A9",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          ></div>
          <p style={{ color: "#666" }}>Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  // If has access, render the children
  return children;
};

export default SubscriptionRoute;
