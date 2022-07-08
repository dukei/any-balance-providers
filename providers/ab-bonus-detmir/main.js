/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language':'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Content-Type': 'application/json',
	'Origin': 'https://www.detmir.ru',
    'Referer': 'https://www.detmir.ru/',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36',
	'X-Requested-With': 'detmir-ui'
};

var cardType = {
    virtual_card_ru: 'Виртуальная',
    new_card_ru: 'Пластиковая',
	undefined: ''
};
	
var cardState = {
    active: 'Активна',
    restricted: 'Не активна',
	undefined: ''
};

var baseurl = 'https://api.detmir.ru';
var g_csrf;
var g_savedData;

function main(){
    var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8'); 
	
	if(!g_savedData)
		g_savedData = new SavedData('detmir', prefs.login);

	g_savedData.restoreCookies();
	
	AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/v2/users/self/loyalties?', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 500) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже');
	}
	
	var json = getJson(html);
	
	if (!json.resources) {
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	var html = AnyBalance.requestGet(baseurl + '/v2/users/self/loyalties?', g_headers);
	
	var json = getJson(html);
	
	AnyBalance.trace('Найдено карт лояльности: ' + json.resources.length);

	if(json.resources.length < 1)
		throw new AnyBalance.Error('У вас нет ни одной карты лояльности');

	var curCard;
	for(var i=0; i<json.resources.length; ++i){
		var card = json.resources[i];
		AnyBalance.trace('Найдена карта ' + card.pan);
		if(!curCard && (!prefs.num || endsWith(card.pan, prefs.num))){
			AnyBalance.trace('Выбрана карта ' + card.pan);
			curCard = card;
		}
	}

	if(!curCard)
		throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.num);
	
	var cardId = curCard.cftId;
	
	getParam(curCard.pan.replace(/(.*)(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4'), result, '__tariff');
	getParam(curCard.pan.replace(/(.*)(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4'), result, 'cardnum');
	getParam(cardType[curCard.cardType] || curCard.cardType, result, 'cardtype');
	getParam(cardState[curCard.cardState] || curCard.cardState, result, 'cardstate');
	
	var html = AnyBalance.requestGet(baseurl + '/v2/users/self/loyalties/' + cardId + '?expand=cards,marked', g_headers);
	
	var json = getJson(html);
	AnyBalance.trace('Информация по карте: ' + JSON.stringify(json));
	
	getParam(json.balance.total, result, 'balance', null, null, parseBalance);
	getParam(json.balance.active, result, 'active', null, null, parseBalance);
	getParam(json.balance.inactive, result, 'inactive', null, null, parseBalance);
	getParam(json.balance.debt, result, 'debt', null, null, parseBalance);
	if (json.lastUsed)
	    getParam(json.lastUsed, result, 'lastused', null, [/(\d{4})-(\d{2})-(\d{2})(.*)/,'$3.$2.$1'], parseDate);
	
	if (AnyBalance.isAvailable('fio', 'phone')) {
	    var html = AnyBalance.requestGet(baseurl + '/v2/users/self?expand=location', g_headers);
	
	    var json = getJson(html);
	    AnyBalance.trace('Информация из профиля: ' + JSON.stringify(json));
	
	    var fio = json.user.name.first; // Если пользователь не указал в профиле фамилию или отчество, значение fio может иметь вид "Имя null null", поэтому делаем в виде сводки
	    if (json.user.name.middle)
	        fio += ' ' + json.user.name.middle;
	    if (json.user.name.last)
	    	fio += ' ' + json.user.name.last;
	    getParam(fio, result, 'fio');
	    getParam(json.user.phone.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 $1 $2-$3-$4'), result, 'phone');
	}

    AnyBalance.setResult(result);
}
	
function loginSite(prefs) {
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');	
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	if (/^\d+$/.test(prefs.login)){
	    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	}

    var html = AnyBalance.requestGet(baseurl + '/v1/tokens/csrf', g_headers);
	var json = getJson(html);
	g_csrf = json.token;
	AnyBalance.trace('Токен: ' + g_csrf);
        
    var captcha = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', AnyBalance.getLastUrl(), '6LdfO3sUAAAAADw1h0n-Gd3rA8ktxs6hEmuSk5OY', {USERAGENT: g_headers['User-Agent']});
    AnyBalance.trace('Капча: ' + captcha);
	
	html = AnyBalance.requestPost(baseurl + '/v2/users/auth/flash-calls', JSON.stringify({
		'phone': '7' + prefs.login,
		'site': captcha
	}), addHeaders({
		'x-captcha-token': undefined,
        'x-csrf-token': g_csrf
	}));
	
	var json = getJson(html);
	AnyBalance.trace('Запрос звонка: ' + JSON.stringify(json));

    var code = AnyBalance.retrieveCode('Пожалуйста, введите последние 4 цифры звонка, поступившего на номер ' + prefs.login, null, {inputType: 'number', time: 180000});
	
	html = AnyBalance.requestPost(baseurl + '/v2/users/auth/flash-calls', JSON.stringify({
		'code': code,
		'phone': '7' + prefs.login,
	}), addHeaders({
        'x-csrf-token': g_csrf
	}), {httpMethod:'PUT'});
	
	var json = getJson(html);
	AnyBalance.trace('Отправка кода: ' + JSON.stringify(json));
	
	if (json.correct != true) {
       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Неверный код!');
    }
	
	html = AnyBalance.requestPost(baseurl + '/v2/users/auth', JSON.stringify({
		'iso': 'RU-MOW',
		'phone': '7' + prefs.login,
	}), addHeaders({
        'x-csrf-token': g_csrf
	}));
	
	var json = getJson(html);
	AnyBalance.trace('Статус авторизации: ' + JSON.stringify(json));
	
	if (!json.status || json.status != 'ok') {
       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    g_savedData.setCookies();
	g_savedData.save();
	return html;
}