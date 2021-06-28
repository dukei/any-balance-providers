/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://stat-new.k-telecom.org/';
	AnyBalance.setDefaultCharset('UTF-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(baseurl + 'client/auth/login', {
		from_page:'/client/main',
		username:prefs.login,
		password:prefs.password
		},g_headers);

	var html=AnyBalance.requestGet(baseurl+'client/services', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<h4[^>]+style='color:red;text-align:center;'[^>]*>([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /Указан неправильный (пароль|логин)/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var m_element=getElements(html,/<main role="main">/);
	if (m_element.length<1) throw new AnyBalance.Error('Не удалось найти данные. Сайт изменен?');
        m_element=m_element[0];
	var result = {success: true};
	
	getParam(m_element, result, 'balance',/Баланс([\s\S]*?)<\/div/, replaceTagsAndSpaces, parseBalance);
	getParam(m_element, result, 'abon',/Ежемесячный платёж([\s\S]*?)<\/div/, replaceTagsAndSpaces, parseBalance);
	getParam(m_element, result, 'recomended',/Рекомендованный платёж([\s\S]*?)<\/div/, replaceTagsAndSpaces, parseBalance);
	getParam(m_element, result, 'date',/Дата расчёта([\s\S]*?)<\/div/, replaceTagsAndSpaces, parseDate);
	getParam(m_element, result, 'agreement', /Договор([\s\S]*?)<\/div/i, replaceTagsAndSpaces);
	getParam(m_element, result, '__tariff', /Тариф \/ пакет<\/div>([\s\S]*?)<\/div/i, replaceTagsAndSpaces);


	if (AnyBalance.isAvailable('fio')){
		var html=AnyBalance.requestGet(baseurl+'client/main', g_headers);
		var m_element=getElements(html,/<main role="main">/);
		if (m_element.length<1) throw new AnyBalance.Error('Не удалось найти данные. Сайт изменен?');
        	m_element=m_element[0];
        	getParam(m_element, result, 'fio', /Абонент([\s\S]*?)<\/div/i, replaceTagsAndSpaces);
	}
	AnyBalance.setResult(result);
}