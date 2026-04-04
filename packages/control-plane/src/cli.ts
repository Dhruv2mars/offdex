import { resolveControlPlaneBaseUrl, startControlPlaneServer } from "./index";

const server = startControlPlaneServer({
  host: process.env.HOST || "0.0.0.0",
  port: process.env.PORT ? Number(process.env.PORT) : 42421,
  publicUrl: process.env.OFFDEX_CONTROL_PLANE_PUBLIC_URL,
});

const host = process.env.HOST || "0.0.0.0";
const port = server.server.port ?? (process.env.PORT ? Number(process.env.PORT) : 42421);
const publicUrl =
  process.env.OFFDEX_CONTROL_PLANE_PUBLIC_URL ||
  resolveControlPlaneBaseUrl(host, port);

console.log(`Offdex Control Plane listening on ${publicUrl}`);
