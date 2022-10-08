const mysql = require('mysql2');
const dbconfig = require('../config/database.js');
const connection = mysql.createConnection(dbconfig);
var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');    // 1
const { response } = require('express');
router.use(bodyParser.urlencoded({ extended: true }));    // 2

var admin = require("firebase-admin");
let serviceAccount = require('../fcmtest-f0411-firebase-adminsdk-1wfuj-a3bd84bc10.json')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

router.post('/push', (req,res)=>{
    const query = req.query;
    const token = query.token;
    const from = query.from;
    const text = query.text;

    let message = {
        notification: {
            title: from,
            body: text,
          },
        token: token,
    }
    
    admin
    .messaging()
    .send(message)
    .then(function (response) {
      console.log('Successfully sent message: : ', response)
      res.send(true)
    })
    .catch(function (err) {
      console.log('Error Sending message!!! : ', err)
      res.send(false)
    })
})

router.post('/register/token', (req, res)=>{
    const query = req.query;
    const uid = query.uid;
    const token = query.token;

    connection.query("UPDATE user SET token=? WHERE uid=?",[token, uid])
    res.send();
})


router.get('/user', (req,res)=>{
    const query = req.query
    const id = query.id;

    connection.query("SELECT * FROM user WHERE id=?", [id], (err, rows)=>{
        res.status(200).send(rows[0])
    })
})

// 로그인
router.get('/user/login', (req, res)=>{
    const query = req.query;
    const id = query.id;
    const password = query.password;

    connection.query("SELECT * FROM user WHERE id=? and password=?", [id,password], (err,rows)=>{
        if(err) throw err;
        if(rows.length == 0){ // 로그인 실패
            res.status(200).json(
                {
                    "uid" : -1,
                    "id" : "",
                    "password" : "",
                    "name" : "",
                    "image" : "",
                    "state_msg" : ""
                }
            )
        }else{ // 로그인 성공
            res.status(200).send(rows[0]);
        }
    })
})

//회원가입
router.put('/user/register', (req,res)=>{
    const query = req.query;
    const id = query.id;
    const password = query.password;
    const name = query.name;

    connection.query("SELECT * FROM user WHERE id = ?", [id], (err, rows)=>{
        if(rows.length > 0){
            res.status(200).send(false);
        }
        else{
            connection.query("INSERT INTO user VALUES(0, ?, ?, ?, ?, ?)", [id, password, name, null, null], (insertErr, data)=>{
                res.status(200).send(true);
            });
        }
    })
})

//프로필 업데이트 
router.post('/user/update', (req,res)=>{
    const query = req.query;
    const uid = query.uid;
    const name = query.name;
    const image = query.image;
    const state_msg = query.state_msg;

    connection.query("UPDATE user SET name=?, image=?, state_msg=? WHERE uid=?",[name, image, state_msg,uid],(err, rows)=>{
        res.send();
    })
})

//친구목록 조회
router.get('/friend/all', (req,res)=>{
    const user_id = req.query.user_id;

    //SELECT * FROM user WHERE id in (SELECT friend_id FROM friend where user_id = #{user_id})
    connection.query("SELECT * FROM user WHERE id IN (SELECT friend_id FROM friend WHERE user_id = ?)",[user_id] ,(err, rows)=>{
        res.send(rows);
    })
})

//친구추가
router.put('/friend/add', (req,res)=>{
    const query = req.query;
    const user_id = query.user_id;
    const friend_id = query.friend_id;

    //"SELECT * FROM friend WHERE user_id = #{user_id} AND friend_id = #{friend_id}"
    connection.query("SELECT * FROM friend WHERE user_id=? AND friend_id=?", [user_id, friend_id], (err, rows)=>{
        if(rows.length > 0){
            res.send(false);
        }else{
            connection.query("INSERT INTO friend VALUES(?, ?)", [user_id, friend_id], (insertErr, data)=>{
                res.send(true);
            })
        }
    })
})

//내 채팅방 목록 조회
router.get('/my/room', (req,res)=>{
    const user_id = req.query.user_id;

    
    connection.query("select cr.*, u1.name as from_name, u2.name as to_name, u1.image as from_image, u2.image as to_image from chat_room as cr, user as u1, user as u2 where (cr.from_id = u1.id and cr.to_id = u2.id) and (from_id=? or to_id=?)", [user_id,user_id], (err, rows)=>{
        res.status(200).send(rows);
    })
});

router.put('/room/create', (req, res)=>{
    const query = req.query;
    const from_id = query.from_id;
    const to_id = query.to_id;
    const subject = query.subject;
    const time = query.time;

    // 채팅방이 존재하는지 확인
    connection.query("SELECT * FROM chat_room WHERE (from_id=? and to_id=?) or (from_id=? and to_id=?)", [from_id, to_id, to_id, from_id], (err, rows)=>{
        if(rows.length > 0){
            res.send(false);
        }else{ // 없으면 생성
            connection.query("INSERT INTO chat_room values(0, ?, ?, ?, ?)",[from_id, to_id, subject, time], (insertErr, data)=>{
                res.send(true);
            })
        }
    })
})

router.get('/room/info', (req,res)=>{
    const query = req.query;
    const from_id = query.from_id;
    const to_id = query.to_id;

    connection.query("SELECT * FROM chat_room WHERE (from_id=? and to_id=?) or (from_id=? and to_id=?)", [from_id, to_id, to_id, from_id], (err, rows)=>{
        res.send(rows[0])
    })
})

router.post('/room/update', (req, res)=>{
    const query = req.query;
    const room_id = query.room_id;
    const subject = query.subject;
    const time = query.time;

    connection.query("UPDATE chat_room SET subject = ?, time =? WHERE id =?;",[subject, time, room_id], (err, rows)=>{
        res.send();
    })
})

router.get('/get/message', (req,res)=>{
    const room_id = req.query.room_id;

    connection.query("SELECT * FROM message WHERE room_id=?",[room_id],(err,rows)=>{
        if(err) throw err;
        if(rows.length > 0){
            res.send(rows);
        }else{
            var arr = [];
            res.send(arr);
        }
    })
})

router.put('/save/message', (req,res)=>{
    const body = req.body;
    const room_id = body.room_id;
    const sender_uid = body.sender_uid;
    const receiver_uid = body.receiver_uid;
    const text = body.text;
    const time = body.time;
    const flag = body.flag;

    connection.query("INSERT INTO message VALUES(0,?,?,?,?,?,?)",[room_id,sender_uid, receiver_uid, text, time, flag], (err, rows)=>{
        if(err) throw err;
        else{
            res.send(true);
        }
    })
})

module.exports = router;
