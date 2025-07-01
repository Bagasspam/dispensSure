const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const mqtt = require("mqtt");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server }); // Inisialisasi WebSocket server
const port = process.env.PORT || 5000; // Port untuk server web kita

// --- Konfigurasi MQTT Broker (HiveMQ Cloud) ---
const MQTT_BROKER_HOST = "80e90a9ee6a448e2ab1035180bda8649.s1.eu.hivemq.cloud"; // GANTI DENGAN HOST BROKER ANDA!
const MQTT_BROKER_PORT = 8883; // Port TLS/SSL
const MQTT_USERNAME = "iotbre"; // GANTI DENGAN USERNAME BROKER ANDA!
const MQTT_PASSWORD = "Admin#123"; // GANTI DENGAN PASSWORD BROKER ANDA!
const MQTT_CLIENT_ID = `nodejs_dashboard_backend_${Math.random()
  .toString(16)
  .substr(2, 8)}`; // ID unik untuk klien backend

const MQTT_TOPIC_DATA = "sensor/kualitas_air/data"; // Topik untuk menerima data sensor
const RECONNECT_INTERVAL_MS = 5000; // Coba reconnect setiap 5 detik

// --- Konfigurasi MQTT Client Options ---
const mqttOptions = {
  port: MQTT_BROKER_PORT,
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  clientId: MQTT_CLIENT_ID,
  protocol: "mqtts", // Menggunakan mqtts untuk TLS/SSL (wajib untuk 8883)
  clean: true, // Clean session: setiap koneksi baru akan memulai sesi bersih
  reconnectPeriod: RECONNECT_INTERVAL_MS, // Otomatis mencoba reconnect
  tls: {
    rejectUnauthorized: false, // HANYA UNTUK TESTING/DEVELOPMENT.
    // DI PRODUKSI, HARUS DIHAPUS atau gunakan CA certificate yang valid
  },
};

let mqttClient; // Variabel untuk menyimpan instance klien MQTT

// --- Fungsi untuk koneksi dan penanganan event MQTT ---
function connectMqtt() {
  console.log("[MQTT] Mencoba terhubung ke MQTT Broker...");
  mqttClient = mqtt.connect(
    `mqtts://${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT}`,
    mqttOptions
  );

  mqttClient.on("connect", () => {
    console.log("[MQTT] Terhubung ke MQTT Broker!");
    mqttClient.subscribe(MQTT_TOPIC_DATA, (err) => {
      if (!err) {
        console.log(`[MQTT] Berlangganan ke topik: ${MQTT_TOPIC_DATA}`);
      } else {
        console.error(
          `[MQTT] Gagal berlangganan topik ${MQTT_TOPIC_DATA}:`,
          err
        );
      }
    });
  });

  mqttClient.on("reconnect", () => {
    console.log("[MQTT] Mencoba menyambungkan ulang ke MQTT Broker...");
  });

  mqttClient.on("error", (error) => {
    console.error("[MQTT] Terjadi kesalahan:", error);
  });

  mqttClient.on("close", () => {
    console.log("[MQTT] Koneksi MQTT terputus.");
  });

  // Menerima pesan dari MQTT Broker
  mqttClient.on("message", (topic, message) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message.toString()); // Kirim payload mentah JSON ke frontend
      }
    });
  });
}

// Panggil fungsi koneksi MQTT saat server dimulai
connectMqtt();

// --- Konfigurasi WebSocket Server ---
wss.on("connection", (ws) => {
  console.log("[WebSocket] Klien WebSocket terhubung.");
  ws.on("close", () => {
    console.log("[WebSocket] Klien WebSocket terputus.");
  });
  ws.on("error", (error) => {
    console.error("[WebSocket] Kesalahan WebSocket:", error);
  });
});

// --- Sajikan file frontend React.js ---
const frontendBuildPath = path.join(__dirname, "build");
console.log(`[Server] Frontend build path yang dilayani: ${frontendBuildPath}`);

app.use(express.static(frontendBuildPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendBuildPath, "index.html"));
});

// Mulai server HTTP
server.listen(port, () => {
  console.log(`[Server] Backend berjalan di port ${port}`);
  console.log(`[Server] Akses aplikasi di http://localhost:${port}`);
});
