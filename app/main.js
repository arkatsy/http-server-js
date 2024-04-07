const net = require("node:net");

const eol = { matcher: /\r?\n|\r|\n/g, val: "\r\n" };

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const lines = data.toString().split(eol.matcher);

    const [method, path, version] = lines[0].split(" ");
    const headers = lines.slice(1);

    const segs = path.split("/").slice(1);
    if (segs[0] === "echo" && segs[1].length !== 0) {
      const randomStr = segs[1];

      const statusLine = `HTTP/1.1 200 OK`;
      const headersObj = {
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(randomStr),
      };

      const headers = Object.entries(headersObj)
        .map(([key, value]) => `${key}: ${value}`)
        .join(eol.val);

      const del = `${eol.val}${eol.val}`;

      socket.write(`${statusLine}${eol.val}${headers}${del}${randomStr}`);
      return;
    }

    socket.write(`HTTP/1.1 404 Not Found${eol.val}${eol.val}`);
  });

  socket.on("close", () => {
    socket.end();
    server.close();
  });
});

server.listen(4221, "localhost", () => {
  console.log("Server started at localhost:4221");
});
