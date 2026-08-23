import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SocketProvider } from "./hooks/SocketProvider.js";
import { GameCatalogPage } from "./pages/GameCatalogPage.js";
import { GameEntryPage } from "./pages/GameEntryPage.js";
import { RoomPage } from "./pages/RoomPage.js";

export function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<GameCatalogPage />} path="/" />
          <Route element={<GameEntryPage />} path="/games/:gameId" />
          <Route element={<RoomPage />} path="/room/:roomCode" />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}
