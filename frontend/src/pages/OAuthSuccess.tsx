import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function OAuthSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth(); // if your AuthContext exposes a setter

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      // Optionally fetch user info and update context
       fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setUser(data.user);
          navigate("/dashboard");
        })
        .catch(() => navigate("/dashboard"));
    } else {
      navigate("/login");
    }
  }, []);

  return <p>Logging in with Google...</p>;
}
