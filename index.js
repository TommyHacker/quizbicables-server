const app = require("./app");

const { Server } = require("socket.io");
const http = require("http");
const server = http.createServer(app);
const port = process.env.port || 4040;

const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
  },
});

// when a socket is opened / connected

io.on("connection", async (socket) => {
  console.log("client connected!", socket.id);

  // connect user to chosen room
  socket.on("join_room", async ({ roomNumber, username }) => {
    let name = username;
    socket.join(roomNumber);
    // get the amount of current users connected.
    let amounts = await io.in(roomNumber).fetchSockets();
    socket.emit("assign_username", { data: name });
    // send the amount of users connected to the client
    io.to(roomNumber).emit("players_roundup", { players: amounts.length });
    io.to(roomNumber).emit("announcement", {
      message: `user ${username} Connected to room ${roomNumber}`,
    });

    socket.on("next_question", () => {
      io.to(roomNumber).emit("next");
    });

    socket.on("message", (data) => {
      io.to(roomNumber).emit("announcement", data);
    });

    // get the users answer and send it back to all connected clients.
    socket.on("answer", ({ choice, roomNumber }) => {
      console.log(
        "message received from client ",
        "choice: ",
        choice,
        "room number: ",
        roomNumber
      );
      io.to(roomNumber).emit(`results`, { choice });
    });

    // when a user disconnects

    socket.on("disconnect", async (socket) => {
      console.log("client disconnected");
      // update the current amount of users
      amounts = await io.in(roomNumber).fetchSockets();

      io.to(roomNumber).emit("announcement", {
        message: `${name} has disconnected.`,
      });

      // send the new amount of users to every client
      io.to(roomNumber).emit("players_roundup", { players: amounts.length });
    });
  });
});

server.listen(4041, () => console.log("socket server open: 4041"));

// app.listen(port, () => console.log(`server : ${port}`));

// on react front-end install socket.io-client
