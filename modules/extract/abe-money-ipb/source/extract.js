/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.97 Safari/537.36'
};

var baseurl = 'https://on-line.ipb.ru/';

function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'start.aspx', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/sExit/i.test(html)) {
        var params = {
			'__LASTFOCUS': '',
			'_TSM_HiddenField_': getParamByName(html, '_TSM_HiddenField_'),
			'__EVENTTARGET': '',
			'__EVENTARGUMENT': '',
			'__VIEWSTATE': getParamByName(html, '__VIEWSTATE'),
			'__VIEWSTATEGENERATOR':	getParamByName(html, '__VIEWSTATEGENERATOR'),
			'__EVENTVALIDATION': getParamByName(html, '__EVENTVALIDATION'),
			'tbLogin': prefs.login,
			'tbPassword': prefs.password,
			'HiddenField1':'',
			'HiddenField2':'',
			'btnAccept': 'Далее',
			'hfCBW':'',
			'HiddenField_GUID':'',
			'tbxSMSPwd':'',
			'tbxTokenPwd':'',
			'hfewc': 'false',
			'ctl00_HiddenFieldIdAbonent':'',
			'ctl00_HiddenFieldApletVer':'',
			'ctl00_HiddenFieldApletPath':'',
		};

		html = AnyBalance.requestPost(baseurl + 'Login/login.aspx', params, addHeaders({
			Referer: baseurl + 'Login/login.aspx',
			Origin: baseurl
		}));

		__setLoginSuccessful();

	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (/<input[^>]+name="txtCode"/i.test(html)) {
		AnyBalance.trace("Потребовался ввод кода.");
        var msg = getElement(html, /<p[^>]*msgSMSCode[^>]*/i, replaceTagsAndSpaces);
        var form = getElement(html, /<form[^>]+name="login"[^>]*>/i);

        var params = createFormParams(html, function(params, str, name, value) {
            if (name == 'txtCode')
                return AnyBalance.retrieveCode((msg || 'Пожалуйста, введите код из SMS для входа в интернет-банк.' ) + '\n\nЧтобы каждый раз не вводить код, вы можете отключить его в своём интернет банке: меню "Настройки системы"/"Настройки информирования"/"Информирование об операциях в системе", затем снять галочку "Запрашивать SMS-код подтверждения при входе". Это безопасно, код подтверждения всё равно будет требоваться для всех операций.', null, {inputType: 'number', time: 180000});
            return value;
        });

        html = AnyBalance.requestPost(baseurl + 'Login/login.aspx', params, addHeaders({Referer: baseurl + 'secure/login.aspx'}));
	}

	if (!/sExit/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+id="lerrortext"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /(Пароль неверен|не зарегистрирован)/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}


	return html;
}

function getParamByName(html, name) {
	return getParam(html, null, null, new RegExp('name=["\']' + name + '["\'][^>]*value=["\']([^"\']+)"', 'i'));
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	var html = AnyBalance.requestGet(baseurl + 'cards.aspx', g_headers);

	var cardList = getParam(html, null, null, /<table[^>]+class="GridTable"[^>]*>[^]*?<\/div>/i);
	if(!cardList){
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти таблицу с картами.');
		return;
	}

	var cards = getElements(cardList, /<tr[^>]+class="normal[^>]+>/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];

	for(var i=0; i < cards.length; ++i){
		var card = cards[i];
		var id = getParam(card, null, null, /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i);
		var num = getParam(card, null, null, /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		var title = getParam(card, null, null, /<span[^>]+id="ctl00_ContentPlaceHolder1_listDocs_ctl02_lDescr"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, null);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c )) {
			processCard(card, c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {

	AnyBalance.trace('Обработка карты ' + result.__name);

	getParam(card, result, 'cards.balance', /(?:[\s\S]*?<\/table>){1}(?:[^]*?<td[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, 'cards.limit', /(?:[\s\S]*?<\/table>){2}(?:[^]*?<td[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, 'cards.available', /(?:[\s\S]*?<\/table>){2}(?:[^]*?<td[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, ['cards.currency', 'cards.balance', 'cards.limit', 'cards.available'], /<span[^>]+id="ctl00_ContentPlaceHolder1_listDocs_ctl02_lblCurrency"[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /(.*?)/, '0'+ '$1'], parseCurrency);
	getParam(card, result, 'cards.status', /(?:[\s\S]*?<\/table>){2}(?:[^]*?<td[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(card, result, 'cards.till', /(?:[\s\S]*?<\/table>){2}(?:[^]*?<td[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;
	var html = AnyBalance.requestGet(baseurl + 'deposits.aspx', g_headers);
	
	var list = getParam(html, null, null, /<table[^>]+class="GridTable"[^>]*>[^]*?<\/div>/i);
	if(!list){
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти таблицу с депозитами.');
		return;
	}

	var deposits = getElements(list,  /<tr[^>]+class="normal[^>]+>/ig);
	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];

	for(var i=0; i < deposits.length; ++i){
        var dep = deposits[i];
		var id = getParam(dep, null, null, /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		var num = getParam(dep, null, null, /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		var title = getParam(dep, null, null, /<span[^>]+id="ctl00_ContentPlaceHolder1_listDocs_ctl02_lDescr"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('deposits', c)) {
			processDeposit(dep, c);
		}
		
		result.deposits.push(c);
	}
}

function processDeposit(html, result) {
    getParam(html, result, 'deposits.pct', /(?:[\s\S]*?<\/table>){1}(?:[^]*?<td[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'deposits.balance', /(?:[\s\S]*?<\/table>){1}(?:[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['deposit.currency','deposits.balance'], /<span[^>]+id="ctl00_ContentPlaceHolder1_listDocs_ctl02_lblCurrency"[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /(.*?)/, '0'+ '$1'], parseCurrency);
    getParam(html, result, 'deposits.till', /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
}

function processInfo(html, result){
    html = AnyBalance.requestGet(baseurl + 'RbContract.aspx', g_headers);
    var info = result.info = {};

    getParam(html, info, 'info.fio', /<input[^>]+name="ctl00\$ContentPlaceHolder1\$TabContainer1\$TabPanel1\$tbClientName"[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.INN', /<input[^>]+name="ctl00\$ContentPlaceHolder1\$TabContainer1\$TabPanel3\$tbINN"[^>]+value="([\s\S]*?)"/i, replaceHtmlEntities);
    getParam(html, info, 'info.email', /<input[^>]+name="ctl00\$ContentPlaceHolder1\$TabContainer1\$TabPanel1\$tbEmail"[^>]+value="([\s\S]*?)"/i, replaceHtmlEntities);
    getParam(html, info, 'info.till', /<input[^>]+name="ctl00\$ContentPlaceHolder1\$TabContainer1\$TabPanel1\$tbPeriodEndDate"[^>]+value="([\s\S]*?)"/i, replaceHtmlEntities, parseDate);
    getParam(html, info, 'info.agreement', /<input[^>]+name="ctl00\$ContentPlaceHolder1\$TabContainer1\$TabPanel1\$lContractNum"[^>]+value="([\s\S]*?)"/i, replaceHtmlEntities);
}
