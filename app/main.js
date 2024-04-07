const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");

const eol = { matcher: /\r?\n|\r|\n/g, val: "\r\n" };

const codes = {
  200: "HTTP/1.1 200 OK",
  201: "HTTP/1.1 201 Created",
  404: "HTTP/1.1 404 Not Found",
  500: "HTTP/1.1 500 Internal Server Error",
};

const stringifyHeaders = (headers) => {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join(eol.val);
};

function createResponse(statusLine = null, headers = {}, body = null) {
  if (!statusLine) {
    throw new Error(`Cannot construct response without status line`);
  }
  let response = `${statusLine}`;

  const hasHeaders = Object.keys(headers).length;
  if (!hasHeaders) {
    response += `${eol.val}${eol.val}`;
    return response;
  }

  response += `${eol.val}${stringifyHeaders(headers)}`;
  if (body) {
    response += `${eol.val}${eol.val}${body}`;
  }
  return response;
}

const args = process.argv.slice(2);
let opts = {};

if (args.includes("--directory")) {
  const dirCmdIdx = args.indexOf("--directory");
  const dirPath = path.resolve(args[dirCmdIdx + 1]);
  opts["directory"] = dirPath;
}

const server = net.createServer((socket) => {
  socket.setEncoding("utf-8");

  socket.on("data", (data) => {
    const lines = data.toString().split(eol.matcher);

    const [reqMethod, reqPath, reqVersion] = lines[0].split(" ");
    const headers = lines.slice(1);
    const body = lines.slice(headers.length)[0];

    const segs = reqPath.split("/").slice(1);

    switch (true) {
      case segs[0].length === 0: {
        // "/"
        socket.write(createResponse(codes[200]));
        break;
      }
      case segs[0] === "echo": {
        // "/echo/<randomStr>"
        if (!segs[1]) {
          socket.write(createResponse(codes[404]));
          break;
        }
        const randomStr = segs.slice(1).join("/");
        const resHeaders = {
          "Content-Type": "text/plain",
          "Content-Length": Buffer.byteLength(randomStr),
        };
        socket.write(createResponse(codes[200], resHeaders, randomStr));
        break;
      }
      case segs[0] === "user-agent": {
        // "/user-agent"
        const ua = headers.find((header) => header.startsWith("User-Agent: "));
        const uaStr = ua.split(": ")[1];
        const resHeaders = {
          "Content-Type": "text/plain",
          "Content-Length": Buffer.byteLength(uaStr, "utf-8"),
        };
        socket.write(createResponse(codes[200], resHeaders, uaStr));
        break;
      }
      case segs[0] === "files": {
        // "/files/<filename>"
        if (!segs[1]) {
          socket.write(createResponse(codes[404]));
          break;
        }

        if (!opts.directory) {
          socket.write(createResponse(codes[404]));
          break;
        }

        const filename = segs.slice(1).join("/");
        const filePath = path.join(opts.directory, filename);

        switch (reqMethod) {
          case "GET": {
            const fileExists = fs.existsSync(filePath);
            if (!fileExists) {
              socket.write(createResponse(codes[404]));
              socket.end();
              break;
            }

            let fileContents;
            try {
              fileContents = fs.readFileSync(filePath, "utf-8");
            } catch (e) {
              socket.write(createResponse(codes[500]));
              break;
            }

            const resHeaders = {
              "Content-Type": "application/octet-stream",
              "Content-Length": Buffer.byteLength(fileContents),
            };

            socket.write(createResponse(codes[200], resHeaders, fileContents));
            break;
          }
          case "POST": {
            try {
              fs.writeFileSync(filePath, body, "utf-8");
            } catch (e) {
              socket.write(createResponse(codes[500]));
              break;
            }

            socket.write(createResponse(codes[201]));
          }
          default: {
            socket.write(createResponse(codes[404]));
          }
        }
        break;
      }
      default: {
        socket.write(createResponse(codes[404]));
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
