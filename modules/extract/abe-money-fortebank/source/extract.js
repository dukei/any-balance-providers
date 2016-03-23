/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0'
};

var baseurl = 'https://mybank.fortebank.com/';

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'retail/Folder/', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}
	
	if (!/retail\/exit\.aspx/i.test(html)) {
		if(/SessionClose/i.test(html))
			html = AnyBalance.requestGet(baseurl + 'retail/', g_headers);
		
        var params = createFormParams(html, function(params, str, name, value) {
            if (name == 'tbLogin')
                return prefs.login;
            if (name == 'tbPassword')
                return prefs.password;
            if (name == 'tbLoginImg'){
				var src = getParam(html, null, null, /Captcha\/JpegImage\.aspx[^"]+/i, replaceTagsAndSpaces);
				if(src) {
					var img = AnyBalance.requestGet(baseurl + 'retail/' + src, addHeaders({Referer: baseurl}));
					return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {time: 180000});
				}
            	return '';
            }
            return value;
        });
		
		params.loginType = 'textLogin';
		
		html = AnyBalance.requestPost(baseurl + 'retail/', params, addHeaders({Referer: baseurl + 'retail/'}));
	} else {
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}
	
	if (!/retail\/exit\.aspx/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="errMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте правильность указания Логина и Пароля/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

    __setLoginSuccessful();
	
	return html;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;
	
	var html = AnyBalance.requestGet(baseurl + 'retail/Folder/Default.aspx?fld=CardAccount', g_headers);

	var cardList = getParam(html, null, null, /<table[^>]* class="prodlist"[^>]*>[^]*?<\/table>/i);
	cardList = html;
	if(!cardList) {
        if(/У вас нет карт/i.test(html)) {
            AnyBalance.trace('У вас нет карт');
            result.cards = [];
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с картами.');
        }
		return;
	}
	
	var cards = sumParam(cardList, null, null, /<a\s+href="\?fld=CardInfo&id=[^"]+">[\s\S]*?<\/a>/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var card = cards[i];
		var id = getParam(card, null, null, /CardInfo&id=([^"]+)/i, replaceTagsAndSpaces);
		var title = getParam(card, null, null, />([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
		
		var c = {__id: id, __name: title};

		if (__shouldProcess('cards', c)) {
			processCard(card, c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);
	
	var html = AnyBalance.requestGet(baseurl + 'retail/Folder/Default.aspx?fld=CardInfo&id=' + result.__id, g_headers);
	
    getParam(html, result, 'cards.balance', /Доступный баланс:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cards.limit', /Кредитный лимит:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['cards.currency', 'cards'], /Валюта карточного счета:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces);
	
    getParam(html, result, 'cards.num', /Номер карточного счета:(?:[^>]*>){5}([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.status', /Состояние карты:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.till', /Срок действия:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseDateWord);
    getParam(html, result, 'cards.owner', /\d+[*]+\d{4}\s*,([^<]+)/i, replaceTagsAndSpaces);
	
	if(isAvailable('cards.transactions'))
		processCardTransactions(html, result);
}