const app = require('./app');
const roomsList = [];
const { Server } = require('socket.io');
const http = require('http');
const server = http.createServer(app);
const port = process.env.PORT || 4040;
const io = new Server(server, {
	cors: {
		origin: process.env.CLIENT_URL || 'http://localhost:8080',
		methods: ['GET', 'POST'],
	},
});

// when a socket is opened / connected

// globally store users connected users list.
let users = [''];

// connect to game
io.on('connection', async (socket) => {
	// tell client that it has connected.
	socket.emit('message', { data: 'Connected to socket.' });
	console.log(socket.id, ' connected');

	// connect user to chosen room
	socket.on('join_room', async ({ roomNumber, username, isHost, score }) => {
		// convert room number string back to INT
		let roomNum = Number(roomNumber);
		// wait for the user too be connected to room
		await socket.join(roomNum);

		// Get users currently in this room
		const updateRoomUsers = async (data) => {
			let update;
			update = await data.filter((user) => user.roomNumber == roomNum);
			return update;
		};

		let tempArr;

		const updatePlayersData = { roomNumber: roomNum, username, isHost, score };

		// first client state user will return "" , so ignore that index.
		users[0] === ''
			? (tempArr = [updatePlayersData])
			: // if it isnt there, other users have replaced it, so append new user
			  (tempArr = [...users, updatePlayersData]);

		// return users only in this room from global users list.
		let playersInThisRoom = await updateRoomUsers(tempArr);

		// update global users with tempArr
		users = tempArr;

		// send message update when new user joins the room
		io.in(roomNum).emit('message', {
			data: `user ${username} Connected to room ${roomNum}`,
		});

		// send list of only players in this particular room
		io.in(roomNum).emit('players', { data: playersInThisRoom });

		// get the users answer and send it back to all connected clients.
		socket.on('answer', async (data) => {});

		socket.on('update_score', async ({ data }) => {
			const newPlayersList = await data;
			// send the updated score to all players in this room
			io.to(roomNum).emit('players', { data });
		});

		// trigger start game for all users in this room
		socket.on('start_game', () => {
			io.to(roomNum).emit('start_game');
		});

		// pass quiz data from host to players.
		socket.on('setup_quiz', ({ data }) => {
			if (data[0].category) {
				io.to(roomNum).emit('setup_quiz', { data, howMany: data.length });
			}
		});

		// let all users know that this user has taken their turn
		socket.on('turn_taken', async ({ data }) => {
			io.to(roomNum).emit('turns_logged', { data: data + 1 });
		});

		// all turns taken, new question appears, reset turns taken.
		socket.on('reset_turns', () => {
			io.to(roomNum).emit('reset', { data: 0 });
		});

		// all turns taken, let everyone know to go to next question
		socket.on('next_question', () => {
			io.to(roomNum).emit('increment_question');
		});

		// player has left the room
		socket.on('leave_room', async ({ data }) => {
			let tempArr = [];
			const result = await playersInThisRoom.filter(
				(player) => player.username !== data
			);
			playersInThisRoom = await result;
			// trigger redux state reset.
			socket.emit('reset_yourself');
			// remove player socket from room socket
			socket.leave(roomNum);
		});

		// when a socket disconnects
		socket.on('disconnect', async (socket) => {
			// filter out this.socket where the disconnect came from and return it to the rest of the users.
			const removeUser = () => {
				return playersInThisRoom.filter(
					(connection) => connection.username !== username
				);
			};
			playersInThisRoom = removeUser();

			io.to(roomNum).emit('players', { data: playersInThisRoom });

			io.to(roomNum).emit('message', { data: `${username} disconnected.` });
		});
	});

	// socket has disconnected from entire server.
	socket.on('disconnect', () => {});
});

server.listen(port, () => console.log('socket server open:', port));
