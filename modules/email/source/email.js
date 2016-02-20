function Email(){
	var baseurl = 'https://10minutemail.net';

	var timeStart = new Date();
	var html = AnyBalance.requestGet(baseurl + '/', addHeaders({}));
	var email = getParam(html, null, null, /<input[^>]+id="fe_text"[^>]*value="([^"]*)/i);
	if(!email){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить временный e-mail!');
	}

	function prolong(){
		timeStart = new Date();
		html = AnyBalance.requestGet(baseurl + '/more.html', addHeaders({Referer: baseurl + '/'}));
	}

	function checkIncoming(){
		var html = AnyBalance.requestGet(baseurl + '/mailbox.ajax.php?_=' + new Date().getTime(), addHeaders({Referer: baseurl + '/', 'X-Requested-With': 'XMLHttpRequest'}));
		if(!/<table[^>]+maillist/i.test(html)){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось проверить е-мейл!');
		}

		var trs = getElements(html, /<tr[^>]+onclick[^>]*>/ig);
		var emails = [];

		for(var i=0; i<trs.length; ++i){
			var tr = trs[i];
			if(/mid=welcome/i.test(tr))
				continue; //It is welcome email

			
			var name = getParam(tr, null, null, /<a[^>]+href="readmail[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
			var href = getParam(tr, null, null, /<a[^>]+href="readmail.html\?mid=([^"]*)/i);
			var from = getParam(tr, null, null, /<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			var time = getParam(tr, null, null, /<span[^>]*title="(\d{4}[^"]*)/i, replaceHtmlEntities, parseDateISO);

			emails.push({
				name: name,
				id: href,
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
		var html = AnyBalance.requestGet(baseurl + '/readmail.html?mid=' + encodeURIComponent(email.id), addHeaders({Referer: baseurl + '/'}));
		email.text = getElement(html, /<div[^>]+id="tabs-1"[^>]*>/i, replaceTagsAndSpaces);
		email.html = getElement(html, /<div[^>]+id="mailinhtml"[^>]*>/i);
        var atts = getElement(html, /<div[^>]+id="tabs-5"[^>]*>/i);
        if(atts) {
            //Получим аттачменты
            atts = getElements(atts, /<a[^>]+href="attachment[^>]*>/ig);
            AnyBalance.trace('Email ' + email.name + ' has ' + atts.length + ' attachments');
            var attachments = email.attachments = [];
            for (var i = 0; i < atts.length; i++) {
                var att = atts[i];
                var name = getParam(att, null, null, null, replaceTagsAndSpaces);
                var href = getParam(att, null, null, /<a[^>]+href="([^"]*)/i);
                attachments.push({name: name, url: baseurl + '/' + href});
                AnyBalance.trace('Attachment found: ' + name + ': ' + href);
            }
        }

		return true;
	}

    function fetchUrl(url, options){
        return AnyBalance.requestGet(url, addHeaders({Referer: baseurl + '/'}), options);
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
					if(onEmail)
						onEmail(email);
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

			if(dt - timeStart.getTime() >= 9.5*60*1000){
				AnyBalance.trace('Требуется продлить e-mail, продлеваем.');
				prolong();
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