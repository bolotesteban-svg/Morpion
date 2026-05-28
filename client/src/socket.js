import { io } from "socket.io-client";

// En prod, remplace par l'URL de ton backend Render
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const socket = io(SERVER_URL, { autoConnect: true });

export default socket;
