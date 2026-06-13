import { createApplication } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const host = "0.0.0.0";

const { httpServer } = createApplication();

httpServer.listen(port, host, () => {
  console.log(`Multiplayer Blueprint server listening on http://${host}:${port}`);
});
