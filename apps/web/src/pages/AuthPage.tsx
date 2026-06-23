import { AuthForm } from "../components/AuthForm";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  return <AuthForm mode={mode} />;
}
