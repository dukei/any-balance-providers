var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding':'gzip, deflate, sdch',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Host':'wallet.mobilnik.kg',
	'Upgrade-Insecure-Requests':1,
	'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36'
};



function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://wallet.mobilnik.kg/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');


	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	// убрал поля, которые были вне формы
	html = getElement(html, /<form[^>]+id="login_form"[^>]*>/i);

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'passwd')
			return prefs.password;
		return value;
	});


	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({ Referer: baseurl, Origin: baseurl }));

	if(!html || AnyBalance.getLastStatusCode() > 400){

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	} else if(!/logout/.test(html)){

		var err = getParam(html, null, null, /<div[^>]*class="[^\"]*error[^\"]*">([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, replaceHtmlEntities]);
		if (err)
			throw new AnyBalance.Error(err, null, /Неправильный логин\/пароль/i.test(err));
	    
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');

	}


	html = getElement(html, /<div[^>]*class="[^\"]*user-about[^\"]*">/i);

	if(!html) throw new AnyBalance.Error("На странице что-то изменилось. Невозможно получить данные");

	var result = { success: true };

	getParam(html, result, 'username', /<span[^>]*>([^>]*)<\/span>/i, replaceHtmlEntities);

	var dd = getElements(html, /<dd[^>]*>/gi);


	result['account_num'] = dd[0] ? parseBalance(dd[0]) : null;
	result['balance'] = dd[1] ? replaceAll(dd[1], replaceTagsAndSpaces) : null;

	AnyBalance.setResult(result);
}