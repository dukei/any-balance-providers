/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
	'Origin':'https://issa.damavik.by',
};

// Сайт требует разлогиниваться безопасно, чтобы входить в аккаунт чаще чем раз в 5 минут
function logOutSafe(baseurl) {
	AnyBalance.trace('Выходим из личного кабинета...');
	return AnyBalance.requestPost(baseurl, {'action__n18':'logoff'}, addHeaders({Referer: baseurl})); 
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'https://issa.damavik.by/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl, g_headers);
	
	try {
		html = AnyBalance.requestPost(baseurl, {
			form_action_true:'https://issa.damavik.by/about',
			login__n18:prefs.login,
			password__n18:prefs.password,
			action__n18:'login'
		}, addHeaders({Referer: baseurl}));
		
		if (!/Информация о лицевом счете/i.test(html)) {
			var error = getParam(html, null, null, /<h1[^>]*>Вход в систему<\/h1>[\s\S]*?class="redmsg mesg"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
			if (error)
				throw new AnyBalance.Error(error, null, /Введенные данные неверны/i.test(error));
			
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}		
		
		var result = {success: true};
		
		getParam(html, result, 'balance', /Состояние счета[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'fio', /Добро пожаловать,\s*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'acc', /Номер лицевого счета[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
		
		if(isAvailable(['trafic', 'trafic_total'])) {
			var hrefs = sumParam(html, null, null, /<a href="\/([^"]+)"[^>]*>статистика/ig);
			
			AnyBalance.trace('Найдено ссылок на статистику: ' + hrefs.length);
			
			for(var i = 0; i < hrefs.length; i++) {
				AnyBalance.trace('Получаем данные по трафику... попытка №' + (i+1));
				
				html = AnyBalance.requestGet(baseurl + hrefs[i], g_headers);
				
				getParam(html, result, 'trafic_total', /Кол-во трафика в интернет(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseTraffic);
				getParam(html, result, 'trafic', /<th>\s*<\/th>(?:[^>]*>){9}([\d.,]+)/i, [replaceTagsAndSpaces, /(.*)/i, '$1 мб'], parseTraffic);
				getParam(html, result, 'trafic', /(?:<th>[^>]*<\/th>){3}\s*<\/tr>\s*<\/table>/i, [replaceTagsAndSpaces, /([\d.,]+)/i, '$1 мб'], parseTraffic);
				
				if(isset(result.trafic_total) || isset(result.trafic)) {
					AnyBalance.trace('Нашли данные по трафику с попытки №' + (i+1));
					break;
				}
			}
		}
	} catch(e) {
		throw e;
	} finally {
		logOutSafe(baseurl);
	}
	
    AnyBalance.setResult(result);
}