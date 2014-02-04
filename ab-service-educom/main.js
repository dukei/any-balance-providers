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

function getViewState(html) {
	return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://schoolinfo.educom.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Login.aspx?ReturnUrl=%2fDefault.aspx', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'Login.aspx?ReturnUrl=%2fDefault.aspx', {
		'__EVENTTARGET':'ctl00$btnLogin',
		'__EVENTARGUMENT':'',
		'__VIEWSTATE':getViewState(html),
		'ctl00$txtLogin':prefs.login,
		'ctl00$txtPassword':prefs.password,
		'ctl00$SchoolNum':'',
		'ctl00$SchoolName':'',
		'ctl00$District':'Восточный',
		'ctl00$Address':'',
		'ctl00$PrincipalName':'',
		'ctl00$Phone':'',
		'ctl00$AdminLastName':'',
		'ctl00$AdminFirstName':'',
		'ctl00$AdminEmail':'',
		'ctl00$Captcha':'',
		'ctl00$txtRecoveryLogin':'',
		'ctl00$txtPassCaptcha':''
	}, addHeaders({Referer: baseurl + 'Login.aspx?ReturnUrl=%2fDefault.aspx'}));
	
	if (!/logout/i.test(html)) {
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	html = AnyBalance.requestGet(baseurl + 'Pupil/Grades.aspx', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /lass="user-name"[^>]*>([\s\S]*?)<\/table/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /(Округ[\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
	
	getRatingsByName(html, 'Английский', 'english', result);
	getRatingsByName(html, 'Изо', 'izo', result);
	getRatingsByName(html, 'Информатика', 'IT', result);
	getRatingsByName(html, 'Математика', 'matem', result);
	getRatingsByName(html, 'Музыка', 'music', result);
	getRatingsByName(html, 'Окружающий мир', 'world', result);
	getRatingsByName(html, 'Русский язык', 'russian', result);
	getRatingsByName(html, 'Татарский язык', 'tatarian', result);
	getRatingsByName(html, 'Технология', 'tech', result);
	getRatingsByName(html, 'Физическая культура', 'phizics', result);
	getRatingsByName(html, 'Чтение', 'reading', result);
	
	AnyBalance.setResult(result);
}

function getRatingsByName(html, name, counterName, result) {
	var tr = getParam(html, null, null, new RegExp('(<tr>(?:[^>]*>){1}'+ name +'(?:[^>]*>){10,40}\\s*</tr>)', 'i'));
	if(!tr) {
		throw new AnyBalance.Error('Не удалось найти предмет '+name+' в таблице.');
	}
	
	sumParam(tr, result, counterName, /class="grade-with-type"(?:[^>]*>){2}([^<]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
}