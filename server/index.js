require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const harperSaveMessage = require('./services/harper-save-message');
const harperGetMessages = require('./services/harper-get-messages');
const leaveRoom = require('./utils/leave-room');

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const CHAT_BOT = 'ChatBot';
let chatRoom = '';
let allUsers = [];

io.on('connection', (socket) => {
  console.log(`User connected ${socket.id}`);

  socket.on('join_room', (data) => {
    const { username, room } = data;
    socket.join(room);

    // eslint-disable-next-line no-underscore-dangle
    const __createdTime__ = Date.now();

    socket.to(room).emit('receive_message', {
      message: `${username} has joined the chat room`,
      username: CHAT_BOT,
      __createdTime__,
    });

    socket.emit('receive_message', {
      message: `Welcome ${username}`,
      username: CHAT_BOT,
      __createdTime__,
    });

    chatRoom = room;
    allUsers.push({ id: socket.id, username, room });

    const chatRoomUsers = allUsers.filter((user) => user.room === room);

    socket.to(room).emit('chatroom_users', chatRoomUsers);
    socket.emit('chatroom_users', chatRoomUsers);

    harperGetMessages(room)
      .then((response) => {
        console.log(response);
        socket.emit('last_100_messages', response);
      })
      .catch((err) => console.log(err));
  });

  socket.on('send_message', (data) => {
    const {
      message, username, room, __createdTime__,
    } = data;

    io.in(room).emit('receive_message', data);
    harperSaveMessage(message, username, room, __createdTime__)
      .then((response) => console.log(response))
      .catch((err) => console.log(err));
  });

  socket.on('leave_room', (data) => {
    const { username, room } = data;
    socket.leave(room);
    const __createdTime__ = Date.now();

    allUsers = leaveRoom(socket.id, allUsers);
    socket.to(room).emit('chatroom_users', allUsers);
    socket.to(room).emit('receive_message', {
      username: CHAT_BOT,
      message: `${username} has left the chat`,
      __createdTime__,
    });
    console.log(`${username} has left the chat`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected from the chat');
    const users = allUsers.find((user) => user.id === socket.id);
    if (users?.username) {
      allUsers = leaveRoom(socket.id, allUsers);
      socket.to(chatRoom).emit('chatroom_users', allUsers);
      socket.to(chatRoom).emit('receive_message', {
        message: `${users.username} has disconnected from the chat`,
      });
    }
  });
});

server.listen(4000, () => {
  console.log('Server is running on port 4000');
});
