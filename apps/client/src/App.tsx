import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SocketProvider } from "./hooks/SocketProvider.js";
import { HomePage } from "./pages/HomePage.js";
import { RoomPage } from "./pages/RoomPage.js";

export function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route element={<RoomPage />} path="/room/:roomCode" />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}
