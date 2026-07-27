import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth.jsx";
import UpdatePassword from "./UpdatePassword.jsx";
import TravelLog from "./TravelLog.jsx";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div style={{ minHeight: "100vh", background: "#101d33" }} />;
  }
  if (recovery) {
    return <UpdatePassword onDone={() => setRecovery(false)} />;
  }
  if (!session) {
    return <Auth />;
  }
  return <TravelLog session={session} />;
}
