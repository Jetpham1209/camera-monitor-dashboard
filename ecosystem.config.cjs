module.exports = {
  apps: [
    {
      name: "camera-monitor-dashboard",
      script: "server.js",
      autorestart: true,
      restart_delay: 1000,
      max_memory_restart: "500M",
      time: true
    }
  ]
};
