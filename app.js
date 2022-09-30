var express = require('express')
var app = express()
var server = require('http').createServer(app);
var io = require('socket.io')(server);
const bodyParser = require('body-parser');    // 1
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));    // 2

// emit 으로 신호를 보내고, on 으로 받는다.
io.on('connection', (socket) => {
    console.log("user connect");
  
    socket.on('connectReceive', (data) => {
        console.log(data)
    });
  
    socket.on('disconnect', function() {
    console.log('user disconnected');
    });
  
    socket.on('connect user', function(user){
      console.log("Connected user ");
      // 그룹 들어가기
      socket.join(user['roomNumber']);
      console.log("roomNumber : ",user['roomNumber']);
      console.log("state : ",socket.adapter.rooms);
      io.emit('connect user', user);
    });
      //메세지 입력하면 서버 로그에 이거뜸
    socket.on('chat message', function(msg){
      console.log("Message " + msg['text']);
      console.log("보내는 아이디 : ",msg['sender_id']);
      console.log("방 번호 : ", msg['roomNumber'])
      // 그룹 전체에게 메시지 전송
      io.to(msg['roomNumber']).emit('chat message', msg);
    });
    
  });
  
  app.use('/', require('./routes/route.js'));
  
  
  server.listen(8080, function(){
    console.log("server on 8080");
  });
  