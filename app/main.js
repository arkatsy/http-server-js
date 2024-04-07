const net = require("node:net");

const eol = { matcher: /\r?\n|\r|\n/g, val: "\r\n" };
const del = `${eol.val}${eol.val}`;

const stringifyHeaders = (headers) => {
  return Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join(eol.val);
};

const server = net.createServer((socket) => {
  socket.setEncoding("utf-8");
  
  socket.on("data", (data) => {
    const lines = data.toString().split(eol.matcher);

    const [method, path, version] = lines[0].split(" ");
    const headers = lines.slice(1);

    const segs = path.split("/").slice(1);

    if (segs[0].length === 0) {
      socket.write(`HTTP/1.1 200 OK${eol.val}${eol.val}`);
      return;
    }

    if (segs[0] === "echo" && segs[1].length !== 0) {
      const randomStr = segs.slice(1).join("/");

      const statusLine = `HTTP/1.1 200 OK`;
      const resHeaders = {
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(randomStr),
      };

      socket.write(`${statusLine}${eol.val}${stringifyHeaders(resHeaders)}${del}${randomStr}`);
      return;
    }

    if (segs[0] === "user-agent") {
      const ua = headers.find((header) => header.startsWith("User-Agent: "));
      const uaStr = ua.split(": ")[1];

      const statusLine = `HTTP/1.1 200 OK`;
      const resHeaders = {
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(uaStr, "utf-8"),
      };

      socket.write(`${statusLine}${eol.val}${stringifyHeaders(resHeaders)}${del}${uaStr}`);
      return;
    }

    socket.write(`HTTP/1.1 404 Not Found${del}`);
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost", () => {
  console.log("Server started at localhost:4221");
});
