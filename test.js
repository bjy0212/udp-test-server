const dgram = require("dgram"),
    server = dgram.createSocket("udp4");

server.on("error", (error) => {
    console.log(`udp server error: ${error}`);
    server.close();
});

server.on("listening", () => {
    const address = server.address();
    console.log(`server is listening on ${address.address}:${address.port}`);
});

server.on("message", (message, sender) => {
    console.log(`Message: ${message}`);

    server.send(message, sender.port, sender.address, () => {
        console.log(`Message sent to ${sender.address}:${sender.port}`);
    });
});

server.bind(5500);
