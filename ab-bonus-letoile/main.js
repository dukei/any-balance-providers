/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36'
}

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://www.letoile.ru/';

    checkEmpty (prefs.number, 'Введите номер карты');
    checkEmpty (prefs.color, 'Выберите цвет карты');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    html = AnyBalance.requestGet(baseurl + 'ajax/check_account.php?card_type=' + prefs.color + '&card_number=' + prefs.number, addHeaders({
   		Referer: baseurl,
   		'X-Requested-With': 'XMLHttpRequest'
    }));
	
	
	if(/\/anketa\//i.test(html))
		throw new AnyBalance.Error('Необходимо заполнить анкету на сайте зайдите в личный кабинет через браузер и заполните все поля и нажмите отправить.');

	if (!/Баланс\s*карты:/i.test(html)) {
		var error = getParam(html, null, null, /class="g-error"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс\s*карты:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	if(isAvailable('dateOf')) {
		html = AnyBalance.requestGet (baseurl + 'club/cards/account/', g_headers);
		getParam(html, result, 'dateOf', /Данные\s*о\s*балансе(?:[^>]*>){2}(\d{1,2}.\d{1,2}.\d{4} \d{1,2}:\d{2})/i, replaceTagsAndSpaces, parseDate);	
	}

    AnyBalance.setResult (result);
}