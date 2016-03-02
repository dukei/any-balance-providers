function handleBobcmn(url, html){
	if(/"bobcmn"/i.test(html)){
		AnyBalance.trace('Anti-robot defence is encounterd. Overcoming...');
		html = AnyBalance.requestPost('https://interpreter.krawlly.com/interpret.php?action=bobcmn', JSON.stringify({
			url: url,
			files: {
				main: html
			},
			settings: {
				headers: g_headers
			}
		}, g_headers));
		var json = getJson(html);
		if(!json.success){
			if(json.message)
				throw new AnyBalance.Error(json.message);
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Could not send anti-anti-robot request. Is the site changed?');
		}
	
		json = getJson(json.result);
		if(!json.success){
			if(json.message)
				throw new AnyBalance.Error(json.message);
			AnyBalance.trace(json.result);
			throw new AnyBalance.Error('Could not overcome anti-robot defense. Is the site changed?');
		}
	
		var domain = getParam(url, null, null, /^https?:\/\/([^\/]*)/i);
		for(var i=0; i<json.cookies.length; ++i){
			var c = json.cookies[i];
			AnyBalance.setCookie(domain, c.name, c.value);
		}

		var headers = {};
		for(var i=0; json.headers && i<json.headers.length; ++i){
			var h = json.headers[i];
			if(/^content-length$/i.test(h.name))
				continue; //Не ставим автоматом
			headers[h.name] = h.value;
		}
	
		html = AnyBalance.requestPost(json.url || url, json.body, addHeaders(headers), {HTTP_METHOD: json.method});
	}
	return html;
}