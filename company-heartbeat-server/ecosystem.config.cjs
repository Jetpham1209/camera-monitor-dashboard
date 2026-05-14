module.exports = {
  apps: [
    {
      name: "company-heartbeat-server",
      script: "server.js",
      cwd: __dirname,
      autorestart: true,
      restart_delay: 1000,
      max_memory_restart: "300M",
      time: true
    }
  ]
};
