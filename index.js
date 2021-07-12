if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const cluster = require("cluster");
const http = require("http");
const numCPUs = require("os").cpus().length;
const { setupMaster } = require("@socket.io/sticky");
const Monitor = require('./src/Monitor');

if (cluster.isMaster) {
  const httpServer = http.createServer();
  console.log(`Master ${process.pid} is running`);

  setupMaster(httpServer, {
    loadBalancingMethod: "least-connection",
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
  const httpServer = http.createServer();

  httpServer.listen(port, () => console.log(`Listening on port ${port}`));

  const monitor = new Monitor(httpServer);
  monitor.init();
}