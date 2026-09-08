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
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);

      // Un evento con sesión válida siempre se aplica (login, refresco de token, etc.).
      if (newSession) { setSession(newSession); return; }

      // Si llega sin sesión pero NO es un cierre de sesión explícito, es casi
      // siempre un parpadeo de red (típico en móvil al perder cobertura un
      // instante durante la revalidación del token). Lo ignoramos para no
      // desmontar toda la app y perder los datos ya cargados.
      if (event === "SIGNED_OUT") { setSession(null); return; }
      // event sin sesión y sin ser SIGNED_OUT (p.ej. un TOKEN_REFRESHED fallido
      // transitorio): no tocamos el estado de sesión actual.
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
