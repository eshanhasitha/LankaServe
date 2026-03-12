import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import api from "./api";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");

  const login = async () => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await cred.user.getIdToken(true);
      setResult("Admin login success (Firebase token ready)");
    } catch (e) {
      const error = e as any;
      setResult(`code: ${error.code}\nmessage: ${error.message}`);
    }
  };

  const register = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await cred.user.getIdToken(true);
      setResult("Register success. Add admin custom claim for admin access.");
    } catch (e) {
      const error = e as any;
      setResult(`code: ${error.code}\nmessage: ${error.message}`);
    }
  };

  const dashboard = async () => {
    try {
      const res = await api.get("/admin/dashboard");
      setResult(JSON.stringify(res.data, null, 2));
    } catch (e) {
      const error = e as any;
      setResult(JSON.stringify(error.response?.data || error.message, null, 2));
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin App</h2>
      <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
      <button onClick={register}>Register</button>
      <button onClick={dashboard}>Admin Dashboard</button>
      <pre>{result}</pre>
    </div>
  );
}
