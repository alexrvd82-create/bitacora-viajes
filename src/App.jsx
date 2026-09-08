import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "./supabaseClient";
import Landing from "./Landing.jsx";
import Auth from "./Auth.jsx";
import UpdatePassword from "./UpdatePassword.jsx";

const TravelLog = lazy(() => import("./TravelLog.jsx"));

function LoadingScreen() {
  return <div style={{ minHeight: "100vh", background: "#0a0f1e" }} />;
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [recovery, setRecovery] = useState(false);
  const [view, setView] = useState("landing"); // "landing" | "login" | "signup"

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <LoadingScreen />;
  }
  if (recovery) {
    return <UpdatePassword onDone={() => setRecovery(false)} />;
  }
  if (!session) {
    if (view === "landing") {
      return <Landing onStart={() => setView("signup")} onLogin={() => setView("login")} />;
    }
    return <Auth initialMode={view === "signup" ? "signup" : "login"} onBack={() => setView("landing")} />;
  }
  return (
    <Suspense fallback={<LoadingScreen />}>
      <TravelLog session={session} />
    </Suspense>
  );
}
