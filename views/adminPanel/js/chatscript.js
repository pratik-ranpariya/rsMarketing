socket = io.connect('http://localhost:3001');

function sendMessage(data){
	var requestData = {};
	for (var i = 0; i < data.length; i++) {
		requestData[data[i].name] = data[i].value;
 	}
	socket.emit('createRoom', requestData);
}


socket.on('online', function(data){
	console.log("online >>>>>> data :::::: ", data);
	if(data['error'] == 'N'){
		if(data['data']['status']){
			$('#userstatus_'+data['data']['uid']).addClass('status-online');
		}else{
			$('#userstatus_'+data['data']['uid']).removeClass('status-online');
		}
	}
})

socket.on('createRoomResponse', (data)=>{
	console.log("data ::::: ", data);
	if(data['error'] == 'N'){
		$('.closeable').addClass('success');
  		$('#successmsg').html('<strong>Success </strong> '+data['msg']);
	}else{
		$('.closeable').addClass('error');
		$('#successmsg').html('<strong>Problem </strong> '+data['msg']);
	}

	$('.closeable').fadeIn();
  	setTimeout(function(){
  		$('.closeable').fadeOut();
  		$('.mfp-close').trigger('click');
  	},1500);
})

function getChatUsers(){
	socket.emit('getChatUsersList', {id: myid});
	// socket.emit('getChatUsersList', {id: myid});
}

socket.on('sendMsgResponse', (data)=>{
	console.log("data :::: chat :::: ", data);
	var myProfile = $('.myprofile').attr('src');
	console.log(myid+"== "+data.data.senderid)
	if(myid == data.data.senderid){
		var messages = 		'<div class="message-bubble me">'+
							'	<div class="message-bubble-inner">'+
							'		<div class="message-avatar"><img src="'+myProfile+'" alt="" /></div>'+
							'		<div class="message-text"><p>'+data.data.msg+'</p></div>'+
							'	</div>'+
							'	<div class="clearfix"></div>'+
							'</div>';
		$('.message-content-inner').append(messages);
	}else{
		var messages = 		'<div class="message-bubble">'+
							'	<div class="message-bubble-inner">'+
							'		<div class="message-avatar"><img src="'+oppProfile+'" alt="" /></div>'+
							'		<div class="message-text"><p>'+data.data.msg+'</p></div>'+
							'	</div>'+
							'	<div class="clearfix"></div>'+
							'</div>';
		$('.message-content-inner').append(messages);
	}
	$(".message-content-inner").animate({ scrollTop: $('.message-content-inner').prop("scrollHeight")}, 0);
})

function openUserChat(op, room, profile){
	oppProfile = profile;
	opp = op;
	roomName = room;
	$('#oppNameonChat').text(roomName);
	$('.messages-inbox li').removeClass('active-message');
	$('#'+op+'_user').addClass('active-message');
	socket.emit('getChatMsgList', {id: op, room: room});
	console.log("roomName :::::::: ", roomName);
}

socket.on('getChatMsgListResponse', (data)=>{
	console.log("data ::::::::: getChatMsgListResponse :::::: ", data);
	var myProfile = $('.myprofile').attr('src');
	console.log("myProfile ::::::: ", myProfile, myid, oppProfile);
	
	var output = [];
	data = data.data;
	console.log("data.length :::: ", data.length);
	for (var i = 0; i < data.length; i++) {
		console.log("data[i] ::::::: ", data[i].senderid, myid);
		if(parseInt(myid) == parseInt(data[i].senderid)){
			AllMessages = 	'<input type="text" id="opp" value="'+data[i].senderid+'" hidden>'+
						'<div class="message-bubble me">'+
						'	<div class="message-bubble-inner">'+
						'		<div class="message-avatar"><img src="'+myProfile+'" alt="" /></div>'+
						'		<div class="message-text"><p>'+data[i].msg+'</p></div>'+
						'	</div>'+
						'	<div class="clearfix"></div>'+
						'</div>';
			output.push(AllMessages);
		}else{
			AllMessages = 	'<input type="text" id="opp" value="'+data[i].senderid+'" hidden>'+
						'<div class="message-bubble">'+
						'	<div class="message-bubble-inner">'+
						'		<div class="message-avatar"><img src="'+oppProfile+'" alt="" /></div>'+
						'		<div class="message-text"><p>'+data[i].msg+'</p></div>'+
						'	</div>'+
						'	<div class="clearfix"></div>'+
						'</div>';
			output.push(AllMessages);
		}
	}
	$('.message-content-inner').html(output.join(''));
	$(".message-content-inner").animate({ scrollTop: $('.message-content-inner').prop("scrollHeight")}, 0);
})

socket.on('getChatUsersListResponse', (data)=>{
	console.log("getChatUsersListResponse ::::: =>>>>>>>> ", data);
	console.log("data :::::: ", data);
	var output = [];
	var focus = '';
	for (var i = 0; i < data.data.length; i++) {
		if(i==0){
			opp = data.data[i].id;
			focus = 'opponentChat active-message';
			openUserChat(data.data[i].id, data.data[i].room, data.data[i].profile);
		}else{
			focus = 'opponentChat';
		}
		var online = (data.data[i].status) ? 'status-online' : '';
	  	
	  	var users = 	'<li class="'+focus+'" id="'+data.data[i].id+'_user">'+
						'	<a href="#" onclick="openUserChat(\''+data.data[i].id+'\', \''+data.data[i].room+'\',\''+data.data[i].profile+'\')">'+
						'		<div class="message-avatar"><i class="status-icon '+online+'" id="userstatus_'+data.data[i].id+'"></i><img src="'+data.data[i].profile+'" alt="" /></div>'+
						'		<div class="message-by">'+
						'			<div class="message-by-headline">'+
						'				<input type="text" id="opp" value="'+data.data[i].id+'" hidden>'+
						'				<input type="text" id="room" value="'+data.data[i].room+'" hidden>'+
						'				<h5>'+data.data[i].username+'</h5>'+
						'				<span>'+data.data[i].time+'</span>'+
						'			</div>'+
						'			<p>'+data.data[i].message.msg+'</p>'+
						'		</div>'+
						'	</a>'+
						'</li>';
		$('#usersData').append(users);
	}
})