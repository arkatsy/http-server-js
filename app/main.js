const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");

const eol = { matcher: /\r?\n|\r|\n/g, val: "\r\n" };
const del = `${eol.val}${eol.val}`;

const stringifyHeaders = (headers) => {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join(eol.val);
};

const args = process.argv.slice(2);
let opts = {};

if (args.includes("--directory")) {
  const dirCmdIdx = args.indexOf("--directory");
  const dirPath = path.resolve(args[dirCmdIdx + 1]);
  opts = Object.assign(opts, { directory: dirPath });
}

const server = net.createServer((socket) => {
  socket.setEncoding("utf-8");

  socket.on("data", (data) => {
    const lines = data.toString().split(eol.matcher);

    const [reqMethod, reqPath, reqVersion] = lines[0].split(" ");
    const headers = lines.slice(1);

    const segs = reqPath.split("/").slice(1);

    switch (true) {
      case segs[0].length === 0: {
        // "/"
        socket.write(`HTTP/1.1 200 OK${del}`);
        break;
      }
      case segs[0] === "echo": {
        // "/echo/<randomStr>"
        if (!segs[1]) {
          socket.write(`HTTP/1.1 404 Not Found${del}`);
          break;
        }
        const randomStr = segs.slice(1).join("/");
        const statusLine = `HTTP/1.1 200 OK`;
        const resHeaders = {
          "Content-Type": "text/plain",
          "Content-Length": Buffer.byteLength(randomStr),
        };
        socket.write(`${statusLine}${eol.val}${stringifyHeaders(resHeaders)}${del}${randomStr}`);
        break;
      }
      case segs[0] === "user-agent": {
        // "/user-agent"
        const ua = headers.find((header) => header.startsWith("User-Agent: "));
        const uaStr = ua.split(": ")[1];
        const statusLine = `HTTP/1.1 200 OK`;
        const resHeaders = {
          "Content-Type": "text/plain",
          "Content-Length": Buffer.byteLength(uaStr, "utf-8"),
        };
        socket.write(`${statusLine}${eol.val}${stringifyHeaders(resHeaders)}${del}${uaStr}`);
        break;
      }
      case segs[0] === "files": {
        // "/files/<filename>"
        if (!segs[1]) {
          socket.write(`HTTP/1.1 404 Not Found${del}`);
          break;
        }

        if (!opts.directory) {
          socket.write(`HTTP/1.1 404 Not Found${del}`);
          break;
        }

        const filename = segs.slice(1).join("/");
        const filePath = path.join(opts.directory, filename);

        const fileExists = fs.existsSync(filePath);
        if (!fileExists) {
          socket.write(`HTTP/1.1 404 Not Found${del}`);
          socket.end();
          break;
        }

        const fileContent = fs.readFileSync(filePath, "utf-8");
        const statusLine = `HTTP/1.1 200 OK`;
        const resHeaders = {
          "Content-Type": "application/octet-stream",
          "Content-Length": Buffer.byteLength(fileContent),
        };

        socket.write(`${statusLine}${eol.val}${stringifyHeaders(resHeaders)}${del}${fileContent}`);
        break;
      }
      default: {
        socket.write(`HTTP/1.1 404 Not Found${del}`);
      }
    }
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost", () => {
  console.log("Server started at localhost:4221");
});
