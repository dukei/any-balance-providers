
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
};

function main() {
	var baseurl = 'https://minsk.gov.by/ru/och';

	var prefs = AnyBalance.getPreferences();

	AB.checkEmpty(prefs.surname, 'Укажите фамилию!');
	AB.checkEmpty(prefs.username, 'Укажите имя!');
	AB.checkEmpty(prefs.patronymic, 'Укажите отчество!');
	AB.checkEmpty(prefs.surname.trim() == prefs.surname, 'В фамилии не допускаются пробелы в начале и конце! Удалите их.');
	AB.checkEmpty(prefs.username.trim() == prefs.username, 'В имени не допускаются пробелы в начале и конце! Удалите их.');
	AB.checkEmpty(prefs.patronymic.trim() == prefs.patronymic, 'В отчестве не допускаются пробелы в начале и конце! Удалите их.');
	AB.checkEmpty(/^\d\d\.\d\d\.\d\d\d\d$/.test(prefs.birthday), 'Укажите дату рождения в формате ДД.ММ.ГГГГ (например 12.01.1982)!');
	AB.checkEmpty(/^\d\d\d\d$/.test(prefs.become), 'Укажите год постановки на учет в формате ГГГГ (например 2002)!');
	AB.checkEmpty(prefs.rn, 'Укажите район!');

	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl, {
		surname: prefs.surname,
		name: prefs.username,
		patronymic: prefs.patronymic,
		day: prefs.birthday.substr(0,2),
		month: prefs.birthday.substr(3, 2),
		year: prefs.birthday.substr(6, 4),
		become: prefs.become,
		rn: prefs.rn,
		enter: 'Получить информацию'
	}, AB.addHeaders({ Referer: baseurl }));

	var error = AB.getParam(html, null, null, /(По вашему запросу(?:.(?!\/div>))+)/i, AB.replaceTagsAndSpaces);
	if (error) {
		throw new AnyBalance.Error(error, null, /По вашему запросу/i.test(error));
	}
	error = getParam(html, null, null, /<\/form>([\s\S]*?)<div[^>]+id="foot-bar"/i, AB.replaceTagsAndSpaces);
	if(error) {
		throw new AnyBalance.Error(error, null, /все поля/i.test(error));
	}
	if (!/content/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
	}
	
	var result = { success: true };

	AB.getParam(html, result, 'family', /составом семьи (\d+) чел/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'general_date', /общем списке c (\d+[^\d]+\d+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'general_number', /под номером (\d+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'separate_date', /отдельный список c (\d+[^\d]+\d+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'separate_number', /в этом списке (\d+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'provider', /Информация предоставлена:([^<]+)Дата обновления/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'updated', /Дата обновления:\s*(\d+[^\d]+\d+)/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
