/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var g_manifestIds = {
	'Английский язык': 'english',
	'Литературное чтение': 'literature',
	'Изобразительное искусство': 'izo',
	'Математика': 'matem',
	'Музыка': 'muz',
	'Окружающий мир': 'world',
	'Русский язык': 'russian',
	'Технология': 'tech',
	'Физическая культура': 'phiz',
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://petersburgedu.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'user/auth/login/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'user/auth/login/', {
		Login: prefs.login,
		Password: prefs.password,
		RememberMe:'0',
		doLogin:'1',
		authsubmit:'Войти'
	}, addHeaders({Referer: baseurl + 'user/auth/login/', 'X-Requested-With':'XMLHttpRequest'}));
	
	var json = getJson(html);
	
	if (json.status != 'ok') {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'dnevnik/lessons/?period=' + (prefs.period || 'current'), g_headers);
	
	var lessonsTable = getParam(html, null, null, /<table[^>]*lessons-list[\s\S]*?<\/table>/i);
	var marksTable = getParam(html, null, null, /<table[^>]*marks-table[\s\S]*?<\/table>/i);
	
	checkEmpty(lessonsTable && marksTable, 'Не удалось найти таблицу предметов, сайт изменен?', true);
	
	var subjects = sumParam(lessonsTable, null, null, /subject\/\d+[^>]*>([^<]+)/ig, replaceTagsAndSpaces);
	AnyBalance.trace('Найдено предметов: ' + subjects.length);
	
	var marks = sumParam(marksTable, null, null, /<tr>\s*<td>[\s\S]*?<\/td>\s*<\/tr>/ig);
	AnyBalance.trace('Найдено строк: ' + marks.length);
	
	var result = {success: true};
	
	for(var i = 0; i < subjects.length; i++) {
		var current = subjects[i];
		var markTr = marks[i];
		AnyBalance.trace('Текущий предмет: ' + current);
		// AnyBalance.trace('Таблица оценок: ' + markTr);
		
		var marksDigits = sumParam(markTr, null, null, /<span[^>]*>\s*(\d+)/ig, replaceTagsAndSpaces, parseBalance);
		if(marksDigits.length > 0) {
			var marksStr = marksDigits.join(',');
			
			AnyBalance.trace('Оценки по предмету: ' + marksStr);
			getParam(marksStr, result, g_manifestIds[current]);
			getParam(((aggregate_sum(marksDigits) / marksDigits.length)).toFixed(1), result, g_manifestIds[current] + '_rounded');
		} else {
			AnyBalance.trace('Нет оценок по предмету ' + current);
		}
	}
	
	AnyBalance.setResult(result);
}