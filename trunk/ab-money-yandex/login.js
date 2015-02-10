/**
Процедура входа в Яндекс. Унифицирована и выделена в отдельный файл для удобства встраивания
*/

function loginYandex(login, password, html, retpath, from) {
	function getIdKey(html) {
		return getParam(html, null, null, /<input[^>]*name="idkey"[^>]*value="([^"]*)/i);
	}
	var baseurl = "https://passport.yandex.ru/passport?mode=auth";
	if (from) baseurl += '&from=' + encodeURIComponent(from);
	if (retpath) baseurl += '&retpath=' + encodeURIComponent(retpath);
	if (!html) html = AnyBalance.requestGet(baseurl, g_headers);
	var idKey = getIdKey(html);
	// Если нет этого параметра, то это другой тип кабинета
	if (idKey) {
		var html = AnyBalance.requestPost(baseurl, {
			from: from || 'passport',
			retpath: retpath,
			idkey: idKey,
			display: 'page',
			login: login,
			passwd: password,
			timestamp: new Date().getTime()
		}, g_headers);
	} else {
		var html = AnyBalance.requestPost(baseurl, {
			//from:from || 'passport',
			retpath: retpath,
			login: login,
			passwd: password,
		}, addHeaders({
			Referer: baseurl
		}));
	}
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, [/b\-login\-error[^>]*>([\s\S]*?)<\/strong>/i, /error-msg[^>]*>([^<]+)/i], replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Учётной записи с таким логином не существует|Неправильная пара логин-пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет Яндекса. Сайт изменен?');
	}
	if (/Установить постоянную авторизацию на(?:\s|&nbsp;)+данном компьютере\?/i.test(html)) {
		//Яндекс задаёт дурацкие вопросы.
		AnyBalance.trace("Яндекс спрашивает, нужно ли запоминать этот компьютер. Отвечаем, что нет... (idkey=" + getIdKey(html) + ")");
		html = AnyBalance.requestPost(baseurl, {
			filled: 'yes',
			timestamp: new Date().getTime(),
			idkey: getIdKey(html),
			no: 1
		}, g_headers);
	}
	return html;
}