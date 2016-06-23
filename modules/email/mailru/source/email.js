function Email_mailru(login, password, timeback){
	var baseurlStart = 'https://mail.ru/';
	var baseurl = 'https://e.mail.ru/';

	var html = loginMailRu(login, password, baseurlStart);
	var email = login;
	var lastModified = Math.floor(new Date().getTime()/1000);

	html = AnyBalance.requestGet(baseurl + 'messages/inbox/', addHeaders({Referer: baseurlStart}));

	var lastEMails = getExistingEmails(html);
	var existingEmails = {};
	var newEmailes = [];
	for(var i=0; i<lastEMails.length; ++i){
		var m = lastEMails[i];
		if(lastModified - m.date >= (timeback || 0)) //Некоторые не очень старые письма считаем всё равно новыми
			existingEmails[m.id] = m;
		else
			newEmailes.push(m);
	}

	var token = getParam(html, null, null, /patron.updateToken\s*\(\s*["']([^"']*)/);
	if(!token){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти token API. Сайт изменен?');
	}

	var form_sign = getParam(token, null, null, /^[^:]*/);
	var form_token = getParam(token, null, null, /[^:]*$/);

	var tarball = getParam(html, null, null, /patron,\s*'(e.mail.ru[^']*)/);
	if(!tarball){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти token tarball. Сайт изменен?');
	}

	function getExistingEmails(html){
		var json = getParam(html, null, null, /arMailRuMessages\s*=\s*(\(\s*function[\s\S]*?\)\(\);)/, [/^/, 'return ', /ajs.Html.unescape/, 'html_unescape'], function(script){
			return safeEval(script, 'html_unescape', [html_entity_decode]);
		});
		AnyBalance.trace(JSON.stringify(json));
		return json;
	}

	var uuids = {};
    function uuid(a) {
        var b = function() {
            return Math.floor(Math.random() * 65536).toString(16)
        }
        if (a !== void 0) {
            return uuids[a] || (uuids[a] = uuid())
        }
        return b() + b() + "-" + b() + "-" + b() + "-" + b() + "-" + b() + b() + b()
    }

	function getStatus(){
		var html = AnyBalance.requestGet(baseurl + 'api/v1/messages/status?' + AB.createUrlEncodedParams({
			ajax_call:	1,
			'x-email': 	email,
			tarball: tarball,
			'tab-time':	lastModified,
			email:	email,
			sort:	'{"type":"date","order":"desc"}',
			offset:	0,
			limit:	26,
			folder:	0,
			htmlencoded:	'false',
			last_modified:	lastModified,
			letters:	'true',
			nolog:	1,
			sortby:	'D',
			rnd:	Math.random(),
			api:	1,
			token:	token
		}), addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			'X-Request-Id': uuid(),
			Referer: baseurl + 'messages/inbox/'
		}));

		var json = getJson(html);
		lastModified = json.last_modified || lastModified;

		if(json.status != 200 && json.status != 304){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Неизвестный статус новых писем!');
		}

		return json;
	}

	function getMessage(id){
		var html = AnyBalance.requestGet(baseurl + 'api/v1/messages/message?' + AB.createUrlEncodedParams({
			ajax_call:	1,
			'x-email':	email,
			tarball:	tarball,
			'tab-time':	lastModified,
			email:	email,
			htmlencoded:	'false',
			multi_msg_prev:	0,
			multi_msg_past:	0,
			sortby:	'D',
			NewAttachViewer:	1,
			AvStatusBar:	1,
			let_body_type:	'let_body_plain',
			log:	0,
			bulk_show_images:	0,
			folder:	0,
			wrap_body:	0,
			id:	id,
			NoMSG:	'true',
			read:	0,
			mark_read:	'false',
			api:	1,
			token:	token
		}), addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			'X-Request-Id': uuid(),
			Referer: baseurl + 'messages/inbox/'
		}));

		return getJson(html);
	}

	function checkIncoming(){
		var status = getStatus();

		var emails = [];

		var emailsToCheck = newEmailes;

		if(status.status == 304 && !emailsToCheck.length)
			return emails; //Ничего не изменилось

		emailsToCheck = ((status.body && status.body.messages) || []).concat(newEmailes);
		newEmails = []; //Только один раз надо посмотреть старые емейлы

		for(var i=emailsToCheck.length-1; i>=0; --i){
			var m = emailsToCheck[i];
			if(existingEmails[m.id])
				continue; //Уже есть такое письмо
			
			var name = m.subject;
			var id = m.id;
			var from = m.correspondents.from[0].email;
			var time = m.date*1000;

			emails.push({
				name: name,
				id: id,
				from: from,
				time: time
			});
		}

		return emails;
	}

	/**
	 *
	 * @param email {
	 * 		id: string,
	 * 		name: string,
	 * 		from: string,
	 * 		text: string,
	 *		html: string,
	 *		atts: [
	 *			{
	 *				name: string,
	 *				url: string
	 *			}
	 *		]
	 * }
	 * @returns {boolean}
	 */
	function fetch(email){
        AnyBalance.trace('Fetching email ' + email.name + ' from ' + email.from);
		var m = getMessage(email.id).body;

		email.text = m.body.text;
		email.html = m.body.html;

        //Получим аттачменты
        var atts = (m.attaches && m.attaches.list) || [];
        AnyBalance.trace('Email ' + email.name + ' has ' + atts.length + ' attachments');
        if(atts.length){
            var attachments = email.attachments = [];
            for (var i = 0; i < atts.length; i++) {
                var att = atts[i];
                var name = att.name;
                var href = att.href.download;
                attachments.push({name: name, url: href});
                AnyBalance.trace('Attachment found: ' + name + ': ' + href);
            }
        }

		return true;
	}

    function fetchUrl(url, options){
        return AnyBalance.requestGet(url, addHeaders({Referer: baseurl}), options);
    }

	function waitForEmails(n, maxtime){
		var fetched = {};

		var waitStart = new Date().getTime();
		do{
			var emails = checkIncoming();

			for(var i=0; i<emails.length; ++i){
				var email = emails[i];
				if(!fetched[email.id]){
					AnyBalance.trace('Получаем емейл от ' + email.from + ': ' + email.name);
					fetch(email);
					fetched[email.id] = email;
					if(onEmail){
						if(onEmail(email) === false){
							n = 0; //Надо прекращать ожидание
							break;
						}
					}
				}
				emails[i] = fetched[email.id];
			}

			if(emails.length >= n)
				return emails;

			var dt = new Date().getTime();

			if(dt - waitStart >= (maxtime || 20*60*1000)){
				AnyBalance.trace('Ждем емейл слишком долго, терпения больше нет, выходим.');
				return emails;
			}

			AnyBalance.sleep(10000);
		}while(true);
	}

	var onEmail;
	/**
	 *
	 * @param callback function(email) {}
	 */
	function setOnEmail(callback){
		onEmail = callback;
	}

	return {
		email: email,
		waitForEmails: waitForEmails,
        fetchAttachment: fetchUrl,
		setOnEmail: setOnEmail
	}
}