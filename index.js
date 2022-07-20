const app = require("./app");

let users = [];
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
  socket.on("message", ({ messageText }) => {
    console.log(messageText);
    socket.emit("message", { data: messageText });
  });
  socket.emit("message", { data: "Connected to socket." });

  // so we can give the current users info to each user as they join

  // connect user to chosen room
  socket.on("join_room", async ({ roomNumber, username, isHost, score }) => {
    let name = username;
    let roomNum = Number(roomNumber);

    users.push({ roomNumber: roomNum, username, isHost, score });

    await socket.join(roomNum);
    io.to(roomNum).emit("players", { data: users });
    // get the amount of current users connected.
    let amounts = await io.in(roomNum).fetchSockets();
    console.log(amounts.length);
    io.in(roomNum).emit("players_count", { data: amounts.length });
    io.in(roomNum).emit("message", {
      data: `user ${username} Connected to room ${roomNum}`,
    });

    console.log(users);
    io.in(roomNum).emit("players", { data: users });

    socket.on("message", ({ data }) => {
      console.log("message received:", data);
      socket.emit("message", { messageText: "hello" });
    });

    socket.on("giveAnswer", ({ data }) => {
      console.log(data);
    });
    // get the users answer and send it back to all connected clients.
    socket.on("answer", async (data) => {
      console.log(data);
    });
    io.to(roomNumber).emit(`player_choice`, { data: "something" });

    // when a user disconnects

    socket.on("disconnect", async (socket) => {
      console.log("client disconnected");
      // update the current amount of users
      amounts = await io.in(roomNum).fetchSockets();
      const updateUsers =
        users.length > 1 && users.filter((user) => user.username !== username);
      users = updateUsers;
      io.to(roomNum).emit("players", { data: users });
      io.to(roomNum).emit("message", { data: `${username} disconnected.` });
      // send the new amount of users to every client
      io.to(roomNum).emit("players_roundup", { players: amounts.length });
    });
  });
  socket.on("disconnect", () => {
    console.log("user disconnected.");
  });
});

server.listen(4041, () => console.log("socket server open: 4041"));

// app.listen(port, () => console.log(`server : ${port}`));

// on react front-end install socket.io-client
