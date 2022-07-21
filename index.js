const app = require("./app");
const roomsList = [];
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
let users = [""];
io.on("connection", async (socket) => {
  console.log("client connected!", socket.id);
  socket.on("message", ({ messageText }) => {
    // console.log(messageText);
    socket.emit("message", { data: messageText });
  });
  socket.emit("message", { data: "Connected to socket." });

  // so we can give the current users info to each user as they join

  // connect user to chosen room
  socket.on("join_room", async ({ roomNumber, username, isHost, score }) => {
    let name = username;
    let roomNum = Number(roomNumber);
    await socket.join(roomNum);

    let tempArr;
    const updatePlayersData = { roomNumber: roomNum, username, isHost, score };
    users[0] === ""
      ? (tempArr = [updatePlayersData])
      : (tempArr = [...users, updatePlayersData]);
    let playersInThisRoom = tempArr.filter(
      (user) => user.roomNumber === roomNum
    );
    users = tempArr;
    // console.log("updated users", users);

    io.to(roomNum).emit("players", { data: playersInThisRoom });
    // get the amount of current users connected.
    let amounts = await io.in(roomNum).fetchSockets();
    // console.log(amounts.length);
    io.in(roomNum).emit("players_count", { data: amounts.length });
    io.in(roomNum).emit("message", {
      data: `user ${username} Connected to room ${roomNum}`,
    });

    console.log(users);
    io.in(roomNum).emit("players", { data: playersInThisRoom });

    socket.on("giveAnswer", ({ data }) => {
      // console.log(data);
    });
    // get the users answer and send it back to all connected clients.
    socket.on("answer", async (data) => {
      // console.log(data);
    });
    io.to(roomNumber).emit(`player_choice`, { data: "something" });

    socket.on("update_score", (data) => {
      // console.log("this is the update score data", data);
      let tempScoreArr = [];
      playersInThisRoom.map((el) => {
        if (el.username == data.username) {
          console.log(`updating ${el.username}'s score to ${score}`);
          el.score = data.score;
          tempScoreArr.push(el);
        } else {
          tempScoreArr.push(el);
        }
      });
      playersInThisRoom = tempScoreArr;
      io.to(roomNum).emit("players", { data: users });
    });

    socket.on("start_game", () => {
      io.to(roomNum).emit("start_game");
    });

    socket.on("setup_quiz", ({ data }) => {
      if (data[0].category) {
        console.log("setup data", data.length);
        io.to(roomNum).emit("setup_quiz", { data, howMany: data.length });
      }
    });

    socket.on("turn_taken", async ({ data }) => {
      console.log("turns taken data:", data + 1);
      console.log("players in this room:", playersInThisRoom.length);
      io.to(roomNum).emit("turns_logged", { data: data + 1 });
    });
    socket.on("reset_turns", () => {
      io.to(roomNum).emit("reset", { data: 0 });
    });

    socket.on("next_question", () => {
      console.log("next question triggered.");
      io.to(roomNum).emit("increment_question");
    });

    // when a user disconnects
    // questionIndex + 1
    //     question
    //     options
    //
    socket.on("disconnect", async (socket) => {
      console.log("client disconnected");
      // update the current amount of users
      amounts = await io.in(roomNum).fetchSockets();
      console.log(amounts.length, "left in room");
      // if (amounts.length == 0) {
      //   console.log("removing room");
      //   io.in(roomNum).socketsLeave(roomNum);
      // }
      const updateUsers =
        users.length >= 2
          ? users.filter((user) => user.username !== username)
          : [""];
      users = updateUsers;

      io.to(roomNum).emit("players", { data: playersInThisRoom });
      io.to(roomNum).emit("message", { data: `${username} disconnected.` });
      // send the new amount of users to every client in this room
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
