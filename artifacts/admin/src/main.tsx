import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

setAuthTokenGetter(() => "dev-token-mora");

createRoot(document.getElementById("root")!).render(<App />);