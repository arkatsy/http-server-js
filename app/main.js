const net = require("node:net");

const eol = /\r?\n|\r|\n/g;

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    // socket.write('HTTP/1.1 200 OK\r\n\r\n')
    // =======================================
    // GET /index.html HTTP/1.1
    // Host: localhost:4221
    // User-Agent: curl/7.64.1
    const lines = data.toString().split(eol);

    const [method, path, version] = lines[0].split(" ");
    const headers = lines.slice(1);

    if (path.split("/")[1].length === 0) {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
      return;
    }
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
  });

  socket.on("close", () => {
    socket.end();
    server.close();
  });
});

server.listen(4221, "localhost", () => {
  console.log("Server started at localhost:4221");
});
