import React, { useState, useEffect, useRef, useCallback } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// =========================================================================
// FUNGSI BANTU UNTUK WARNA DINAMIS (SAMA SEPERTI SEBELUMNYA)
// =========================================================================

function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function getInterpolatedColor(value, minValue, maxValue, colorStops) {
  value = Math.max(minValue, Math.min(maxValue, value));
  const factor = (value - minValue) / (maxValue - minValue);

  let segmentIndex = 0;
  while (
    segmentIndex < colorStops.length - 1 &&
    factor > colorStops[segmentIndex + 1].position
  ) {
    segmentIndex++;
  }

  const startSegment = colorStops[segmentIndex];
  const endSegment = colorStops[segmentIndex + 1] || startSegment;

  const segmentFactor =
    (factor - startSegment.position) /
    (endSegment.position - startSegment.position);

  const startRgb = hexToRgb(startSegment.color);
  const endRgb = hexToRgb(endSegment.color);

  const r = Math.round(startRgb[0] + segmentFactor * (endRgb[0] - startRgb[0]));
  const g = Math.round(startRgb[1] + segmentFactor * (endRgb[1] - startRgb[1]));
  const b = Math.round(startRgb[2] + segmentFactor * (endRgb[2] - startRgb[2]));

  return `rgb(${r}, ${g}, ${b})`;
}

// =========================================================================
// DEFINISI STOP WARNA UNTUK GAUGE (SAMA SEPERTI SEBELUMNYA)
// =========================================================================

const TDS_COLOR_STOPS = [
  { position: 0.0, color: "#2ecc71" },
  { position: 0.25, color: "#2ecc71" },
  { position: 0.4, color: "#f39c12" },
  { position: 0.6, color: "#e67e22" },
  { position: 1.0, color: "#e74c3c" },
];
const TDS_MAX_GAUGE = 600;

const TEMP_COLOR_STOPS = [
  { position: 0.0, color: "#3498db" },
  { position: 0.375, color: "#2ecc71" },
  { position: 0.625, color: "#f39c12" },
  { position: 0.75, color: "#e67e22" },
  { position: 1.0, color: "#e74c3c" },
];
const TEMP_MAX_GAUGE = 40;

function App() {
  const [tdsData, setTdsData] = useState([]);
  const [tempData, setTempData] = useState([]); // Perbaikan typo: setTempData
  const [currentTds, setCurrentTds] = useState(0);
  const [currentTemp, setCurrentTemp] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(null); // State baru untuk timestamp
  const [websocketStatus, setWebsocketStatus] = useState("connecting"); // State baru untuk status WebSocket

  const websocket = useRef(null);

  useEffect(() => {
    // GANTI URL INI JIKA SUDAH DEPLOY KE RENDER/HOSTING LAIN!
    websocket.current = new WebSocket(
      "wss://dispensure-d46e4eafb6fe.herokuapp.com/"
    );
    // websocket.current = new WebSocket('ws://localhost:5000');

    websocket.current.onopen = () => {
      console.log("Koneksi WebSocket ke backend berhasil.");
      setWebsocketStatus("connected"); // Update status
    };

    websocket.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Data diterima dari backend:", data);

        const newTimestamp = new Date(); // Timestamp saat data diterima
        setLastUpdateTime(newTimestamp); // Update timestamp

        setTdsData((prev) => {
          const newTdsData = [...prev, { x: newTimestamp, y: data.tds }];
          return newTdsData.slice(-30);
        });
        setCurrentTds(data.tds);

        setTempData((prev) => {
          const newTempData = [
            ...prev,
            { x: newTimestamp, y: data.temperature },
          ];
          return newTempData.slice(-30);
        });
        setCurrentTemp(data.temperature);
      } catch (error) {
        console.error("Gagal parse JSON dari WebSocket:", error);
      }
    };

    websocket.current.onclose = () => {
      console.log("Koneksi WebSocket ke backend terputus.");
      setWebsocketStatus("disconnected"); // Update status
      // Optional: Logic untuk mencoba reconnect WebSocket jika diinginkan
    };

    websocket.current.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setWebsocketStatus("error"); // Update status
    };

    return () => {
      if (websocket.current) {
        websocket.current.close();
      }
    };
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Waktu",
          color: "var(--text-color)",
          font: { weight: "600" },
        },
        ticks: {
          color: "var(--text-color)",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: "Nilai",
          color: "var(--text-color)",
          font: { weight: "600" },
        },
        ticks: {
          color: "var(--text-color)",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "var(--text-color)",
          font: { size: 14 },
        },
      },
      title: {
        display: true,
        text: "Data Sensor Real-time",
        color: "var(--text-color)",
        font: {
          size: 18,
          weight: "700",
        },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.7)",
        bodyColor: "white",
        titleColor: "white",
        borderColor: "var(--accent-color)",
        borderWidth: 1,
        bodyFont: { size: 14 },
        titleFont: { size: 16, weight: "bold" },
      },
    },
  };

  const chartTdsData = {
    labels: tdsData.map((item) => item.x.toLocaleTimeString()),
    datasets: [
      {
        label: "TDS (ppm)",
        data: tdsData.map((item) => item.y),
        fill: true,
        backgroundColor: "rgba(46, 204, 113, 0.2)",
        borderColor: "var(--accent-color)",
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "var(--accent-color)",
        pointBorderColor: "white",
        pointHoverRadius: 5,
      },
    ],
  };

  const chartTempData = {
    labels: tempData.map((item) => item.x.toLocaleTimeString()),
    datasets: [
      {
        label: "Suhu (°C)",
        data: tempData.map((item) => item.y),
        fill: true,
        backgroundColor: "rgba(52, 152, 219, 0.2)",
        borderColor: "var(--info-color)",
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "var(--info-color)",
        pointBorderColor: "white",
        pointHoverRadius: 5,
      },
    ],
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Monitoring Kualitas Air IoT</h1>
      </header>

      <div className="dashboard-container">
        {/* Status Koneksi WebSocket */}
        <div className={`connection-status status-${websocketStatus}`}>
          Status Koneksi:{" "}
          {websocketStatus === "connected"
            ? "Terhubung"
            : websocketStatus === "connecting"
            ? "Menghubungkan..."
            : websocketStatus === "disconnected"
            ? "Terputus"
            : "Error"}
        </div>
        {lastUpdateTime && (
          <div className="last-update-time">
            Pembaruan Terakhir: {lastUpdateTime.toLocaleTimeString()}
          </div>
        )}

        {/* Bagian untuk Nilai Saat Ini (TDS dan Suhu) dengan Gauge */}
        <div className="current-data-section">
          {/* Card untuk TDS */}
          <div className="data-card">
            <h2>Total Dissolved Solids</h2>
            <div className="gauge-wrapper">
              <CircularProgressbar
                value={currentTds}
                maxValue={TDS_MAX_GAUGE}
                text={`${currentTds.toFixed(1)}`}
                styles={buildStyles({
                  pathColor: getInterpolatedColor(
                    currentTds,
                    0,
                    TDS_MAX_GAUGE,
                    TDS_COLOR_STOPS
                  ),
                  textColor: "var(--text-color)",
                  trailColor: "rgba(255, 255, 255, 0.2)",
                  backgroundColor: "var(--card-bg)",
                })}
              />
              <span className="gauge-unit-text">ppm</span>
            </div>
          </div>

          {/* Card untuk Suhu */}
          <div className="data-card">
            <h2>Suhu Air</h2>
            <div className="gauge-wrapper">
              <CircularProgressbar
                value={currentTemp}
                maxValue={TEMP_MAX_GAUGE}
                text={`${currentTemp.toFixed(1)}`}
                styles={buildStyles({
                  pathColor: getInterpolatedColor(
                    currentTemp,
                    0,
                    TEMP_MAX_GAUGE,
                    TEMP_COLOR_STOPS
                  ),
                  textColor: "var(--text-color)",
                  trailColor: "rgba(255, 255, 255, 0.2)",
                  backgroundColor: "var(--card-bg)",
                })}
              />
              <span className="gauge-unit-text">°C</span>
            </div>
          </div>
        </div>

        {/* Bagian untuk Grafik */}
        <div className="chart-section">
          <h3>Data Sensor Historis TDS</h3>
          <div
            className="chart-canvas-wrapper"
            style={{ height: "350px", width: "100%" }}
          >
            <Line data={chartTdsData} options={chartOptions} />
          </div>
          <h3>Data Sensor Historis Suhu</h3>
          <div
            className="chart-canvas-wrapper"
            style={{ height: "350px", width: "100%" }}
          >
            <Line data={chartTempData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
