if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const cluster = require("cluster");
const http = require("http");
const { Server } = require("socket.io");
const redisAdapter = require("socket.io-redis");
const numCPUs = require("os").cpus().length;
const { setupMaster, setupWorker } = require("@socket.io/sticky");
const Monitor = require('./src/Monitor');

if (cluster.isMaster) {
  const httpServer = http.createServer();
  console.log(`Master ${process.pid} is running`);

  setupMaster(httpServer, {
    loadBalancingMethod: "least-connection", // either "random", "round-robin" or "least-connection"
  });

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  console.log(`Worker ${process.pid} started`);

  const port = process.env.PORT || 3000;
  const httpServer = http.createServer((req, res) => {
    console.log(`worker on ${process.pid}`);
    res.end(`worker on ${process.pid}`)
  });

  httpServer.listen(port, () => console.log(`Listening on port ${port}`));
  /*const io = new Server(httpServer);
  io.adapter(redisAdapter({ host: "localhost", port: 6379 }));
  setupWorker(io);*/

  const monitor = new Monitor(httpServer);
  monitor.init();
}