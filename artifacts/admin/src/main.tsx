import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getAdminToken } from "@/lib/api";
import App from "./App";
import "./index.css";

setAuthTokenGetter(() => getAdminToken());

createRoot(document.getElementById("root")!).render(<App />);