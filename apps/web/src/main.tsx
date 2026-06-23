import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./pages/App";
import AuthPage from "./pages/AuthPage";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/login", element: <AuthPage mode="login" /> },
  { path: "/register", element: <AuthPage mode="register" /> },
  { path: "/*", element: <App /> }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
