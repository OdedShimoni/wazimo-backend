const socketIo = require("socket.io");
const MeteoApi = require('./MeteoApi');
const redisAdapter = require("socket.io-redis");
const { setupWorker } = require("@socket.io/sticky");

class Monitor {
    server;
    io;
    visitors = [];

    constructor(server) {
        this.server = server;
    }
    
    init() {
        const { server } = this;
        const corsAllowedOrigins = 
            ( (process.env.NODE_ENV === 'development')
                ? '*'
                : [process.env.CLIENT_VISITOR_URI, process.env.CLIENT_ADMIN_URI]
            );
            
        this.io = socketIo(
            server, {
                cors: {
                    origin: corsAllowedOrigins,
                }
            });
        
        // setting up the worker
        this.io.adapter(
            redisAdapter({ host: process.env.REDIS_ADAPTER_HOST, port: process.env.REDIS_ADAPTER_PORT })
        );
        setupWorker(this.io);

        // funnelling news
        this.io.on("connection", (socket) => {
            this.funnelNewsTo(socket);
        });
    }

    funnelNewsTo(socket) {
        /**
         * Send the data initially and every 10 minutes
         * to the socket client
         */

        this.getDataAndSendTo(socket);
        
        const SECOND = 1000;
        const MINUTE = 60 * SECOND;
        setInterval(() => {
            this.getDataAndSendTo(socket);
        }, 10 * MINUTE);
    }

    async getDataAndSendTo(socket) {
        /**
         * Gets and sends the data
         */

        socket.emit('start');
        const alarmingAreas = await this.meteoApi.getAlarmingAreas();
        alarmingAreas.forEach((details, name) => {
            const { td, rh, ws } = details;
            socket.emit('data', { name, td, rh, ws });
        });
    }
}

Monitor.prototype.meteoApi = new MeteoApi(30, 50, 30);

module.exports = Monitor;