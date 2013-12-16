var express = require ('express'),
	app = express(),
	path = require('path'),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	mongoose = require('mongoose');
	users = {};

app.use('/static', express.static(path.join(__dirname, '/static')));
server.listen(3000);

mongoose.connect('mongodb://localhost/chat', function(err){
	if(err){
		console.log(err);
	} else{
		console.log('Connected to mongodb!');
	}
});

var chatSchema = mongoose.Schema({
	nick: String,
	msg: String,
	created: {type: Date, default: Date.now}
});

var Chat = mongoose.model('Message', chatSchema);

app.get('/', function (request, response){
	response.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection',function(socket){
	var query = Chat.find({});
	query.exec(function(err, docs){
		if (err) throw err;
		socket.emit('load old msgs', docs);
	});

	socket.on('new user',function(data,callback){
		if (data in users){
			callback(false);
		}
		else {
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			updateNicknames();
		}
	});

	function updateNicknames(){
		io.sockets.emit('usernames', Object.keys(users));
	}

	socket.on('send message',function(data){
		var msg = data.trim();
		var newMsg = new Chat({msg: msg, nick: socket.nickname});
		newMsg.save(function(err){
			if(err) throw err;
			io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
		});
	});
	socket.on('disconnect',function(data){
		if (!socket.nickname) return;
		delete users[socket.nickname];
		updateNicknames();
	});
});