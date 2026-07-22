import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";

const initialForm = {
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  tax_id: "",
};

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/auth/register", form);
      setSuccess(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Registration failed");
    }
  }

  if (success) {
    return (
      <div>
        <h1>Registration submitted</h1>
        <p>Your account was created and is pending approval. You can log in once it's approved.</p>
        <button onClick={() => navigate("/login")}>Go to login</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username</label>
          <input name="username" value={form.username} onChange={handleChange} required />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>First name</label>
          <input name="first_name" value={form.first_name} onChange={handleChange} required />
        </div>
        <div>
          <label>Last name</label>
          <input name="last_name" value={form.last_name} onChange={handleChange} required />
        </div>
        <div>
          <label>Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <div>
          <label>Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} required />
        </div>
        <div>
          <label>Address</label>
          <input name="address" value={form.address} onChange={handleChange} />
        </div>
        <div>
          <label>City</label>
          <input name="city" value={form.city} onChange={handleChange} />
        </div>
        <div>
          <label>Country</label>
          <input name="country" value={form.country} onChange={handleChange} />
        </div>
        <div>
          <label>Tax ID</label>
          <input name="tax_id" value={form.tax_id} onChange={handleChange} required />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
