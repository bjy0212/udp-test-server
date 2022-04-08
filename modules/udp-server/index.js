const EventEmitter = require("eventemitter3"),
    dgram = require("dgram"),
    server = dgram.createSocket("udp4");

class Server extends EventEmitter {
    /**@type {dgram.Socket} */
    #socket;

    constructor() {
        super();
        this.#socket = new dgram.createSocket("udp4");
        this.#socket.on("error", (error) => {
            this.emit("error", error);
        });
        this.#socket.on("listening", () => {
            this.emit("listening", this.#socket.address().address, this.#socket.address().port);
        });
        this.#socket.on("message", (message, sender) => {
            var th = this;
            var data = JSON.parse(message);

            data.sender = { address: sender.address, port: sender.port };

            data.reply = function (ev, d, callback) {
                th.Send(ev, d, sender, callback);
            };

            // console.log(`${data.event}: ${JSON.stringify(data)}`);

            this.emit(data.event, data, data.sender);
        });
    }

    Send(ev, data, sender, callback) {
        this.#socket.send(JSON.stringify({ event: ev, data: data }), sender.port, sender.address, callback);
    }

    Start(port = 5500) {
        this.#socket.bind(port);
    }

    Close() {
        this.#socket.close();
    }
}

module.exports = { Server };
