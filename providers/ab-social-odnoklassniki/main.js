
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Referer': 'http://m.ok.ru/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://m.ok.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + 'dk?bk=GuestMain&st.cmd=main&_prevCmd=main&tkn=1565', {
		'button_login': 'Войти',
		'fr.login': prefs.login,
		'fr.proto':	'1',
		'fr.needCaptcha': '',
		'fr.password': prefs.password,
		'fr.posted': 'set',
	}, addHeaders({
		Referer: baseurl
	}));

	if (!/Выход/i.test(html)) {
		var error = getParam(html, null, null, /role="alert"[^>]*>([\s\S]*?)<\/ul/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'dk?st.cmd=userPaymentsHistory&_prevCmd=paymentsAndServices&tkn=9895', g_headers);
    
	getParam(html, result, 'balance', /<span[^>]+class="[^"]*ok-balance_value[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<div[^>]+class="[^"]*js-text-username[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /<div[^>]+class="[^"]*js-text-username[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'main', /<span[^>]+id="[^"]*userMain[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance); // Лента
	getParam(html, result, 'dlgs', /<span[^>]+id="[^"]*userDlgs[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance); // Сообщения
	getParam(html, result, 'dscs', /<span[^>]+id="[^"]*userDscs[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance); // Обсуждения
	getParam(html, result, 'events', /<span[^>]+id="[^"]*userEvents[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance); // Оповещения
	getParam(html, result, 'marks', /<span[^>]+id="[^"]*userMarks[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance); // События
	getParam(html, result, 'guests', /<span[^>]+id="[^"]*userGuests[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance); // Гости
	getParam(html, result, 'friends', /<span[^>]+id="[^"]*userFriends[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance); // Друзья
	getParam(html, result, 'groups', /<span[^>]+id="[^"]*userAltGroups[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance); // Группы
	getParam(html, result, 'present', /<span[^>]+id="[^"]*selectPresent[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance); // Подарки
	getParam(html, result, 'showcase', /<span[^>]+id="[^"]*appsShowcase[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance); // Игры
	getParam(html, result, 'offers', /<span[^>]+id="[^"]*offers[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance); // Приложения
	
    html = AnyBalance.requestGet(baseurl + 'dk?st.cmd=userPaymentsCards&_prevCmd=userPaymentsHistory&tkn=2002', g_headers);
	
	var cardNum = getParam(html, null, null, /<div[^>]+class="[^"]*card_mask[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	if(cardNum){
		getParam(cardNum.replace(/(\d{4})(\d{2})(\D*)(\d{4})/i, '$1 $2** **** $4'), result, 'card_num');
	    getParam(html, result, 'card_till', /<div[^>]+class="[^"]*expire-date[^"]*"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseDate);
	}

	AnyBalance.setResult(result);
}
