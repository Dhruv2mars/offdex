import { startControlPlaneServer } from "./index";

const server = startControlPlaneServer({
  host: process.env.HOST || "0.0.0.0",
  port: process.env.PORT ? Number(process.env.PORT) : 42421,
  publicUrl: process.env.OFFDEX_CONTROL_PLANE_PUBLIC_URL,
});

console.log(`Offdex Control Plane listening on http://127.0.0.1:${server.server.port}`);
