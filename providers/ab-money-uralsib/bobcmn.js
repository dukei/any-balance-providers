function handleBobcmn(url, html){
	if(/"bobcmn"/i.test(html)){
		AnyBalance.trace('Встречена защита от роботов. Преодолеваем...');
		html = AnyBalance.requestPost('https://interpreter.krawlly.com/interpret.php?action=bobcmn', JSON.stringify({
			url: baseurl,
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
			throw new AnyBalance.Error('Не удаётся послать запрос для преодоления защиты от роботов. Сайт изменен?');
		}
	
		json = getJson(json.result);
		if(!json.success){
			if(json.message)
				throw new AnyBalance.Error(json.message);
			AnyBalance.trace(json.result);
			throw new AnyBalance.Error('Не удаётся преодолеть защиту от роботов. Сайт изменен?');
		}
	
		var domain = getParam(baseurl, null, null, /^https?:\/\/([^\/]*)/i);
		for(var i=0; i<json.cookies.length; ++i){
			var c = json.cookies[i];
			AnyBalance.setCookie(domain, c.name, c.value);
		}
	
		html = AnyBalance.requestGet(baseurl, addHeaders({Referer: baseurl}));
	}
	return html;
}