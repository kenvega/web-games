import React from "react";
import ReactDOM from "react-dom/client";
import { SymbolContactSheet } from "./SymbolContactSheet.js";

const root = document.getElementById("symbol-contact-sheet-root");
if (root === null) {
  throw new Error("Symbol contact sheet root was not found.");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <SymbolContactSheet />
  </React.StrictMode>
);
