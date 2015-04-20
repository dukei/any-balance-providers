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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://uslugi.khv.gov.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(/^\d{16}$/.test(prefs.login), 'Введите 16 цифр номера заявления без пробелов!');
	
	var html = AnyBalance.requestGet(baseurl + 'dou/request/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl, {
		menu: 'ajax',
		imenu: 'doSearchRequest',
		atype: 'number',
		val1: prefs.login.replace(/(\d{4})/g, '$1 '),
		val2: '',
		val3: '',
		val4: '',
		val5: ''
	}, addHeaders({Referer: baseurl + 'dou/request/', 'X-Requested-With': 'XMLHttpRequest'}));
	
	if (!/request-info/i.test(html)) {
		var error = getParam(html, null, null, /^-1$/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error('К сожалению по вашему запросу не найдено заявления');
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	var status = getParam(html, null, null, /Ребенок не состоит ни в одной очереди./i);
	if(!status)
		status = getParam(html, null, null, />(Посещает[^<]+)/, replaceTagsAndSpaces, html_entity_decode);
	if(!status)
		status = 'В очереди';
	
	getParam(html, result, 'account', /<div[^>]*class='[^']*request-num[^']*'[^>]*>([^]+?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Ребенок:<\/b><br>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(status, result, 'status');

	getParam(html, result, 'commonQueue', /Порядковый номер заявления в общегородской очереди(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'benefitsQueue', /Порядковый номер заявления в льготной очереди(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}