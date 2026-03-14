import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase.ts";
import api from "./api.ts";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");

  const login = async () => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await cred.user.getIdToken(true);
      setResult("Login success (Firebase token ready)");
    } catch (e) {
      const error = e as any;
      setResult(`code: ${error.code}\nmessage: ${error.message}`);
    }
  };

  const register = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await cred.user.getIdToken(true);
      setResult("Register success. You can now call protected route.");
    } catch (e) {
      const error = e as any;
      setResult(`code: ${error.code}\nmessage: ${error.message}`);
    }
  };

  const getProfile = async () => {
    try {
      const res = await api.get("/users/me");
      setResult(JSON.stringify(res.data, null, 2));
    } catch (e) {
      const error = e as any;
      setResult(JSON.stringify(error.response?.data || error.message, null, 2));
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Web App</h2>
      <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
      <button onClick={register}>Register</button>
      <button onClick={getProfile}>Protected Route</button>
      <pre>{result}</pre>
    </div>
  );
}
