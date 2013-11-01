/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding': 'gzip,deflate,sdch',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://www.prior.by',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.prior.by/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'r/Default.aspx?ReturnUrl=%2fr%2fretail%2f', g_headers);

	var loginParams = createFormParams(html);
	
	// Такая вот штука
	//document.write("<img src='LoadTimeInfo.axd?event=OnLoad&" + "&referrer=" + escape(document.referrer) + "&url=" + escape(document.URL) + ((typeof (screen) == "undefined") ? "" : "&screen=" + screen.width + "x" + screen.height + "x" + (screen.colorDepth ? screen.colorDepth : screen.pixelDepth)) + "&r=" + Math.random() + "&renderTimeStart=" + document.getElementById("RenderTimeStart").value + "&renderTimeEnd=" + document.getElementById("RenderTimeEnd").value + "&guid=" + document.getElementById("PageGuid").value + "' alt=' ' style='text-align: left; width: 1px; height: 1px; position: absolute; left: 1px; top: 1px;' />");
	//https://www.prior.by/r/LoadTimeInfo.axd?event=OnLoad&&referrer=&url=https%3A//www.prior.by/r/Default.aspx&screen=1600x900x32&r=0.16393054486252367&renderTimeStart=635189197305990750&renderTimeEnd=635189197307394753&guid=344b4061-5175-41c0-ad1c-5cdd200f234a
	
	html = AnyBalance.requestGet(baseurl + 'r/LoadTimeInfo.axd?event=OnLoad&&referrer=&url=https%3A//www.prior.by/r/Default.aspx&screen=1600x900x32&r=' + Math.random() + '&renderTimeStart=' +
	+ loginParams["RenderTimeStart"] + '&renderTimeEnd='
	+ loginParams["RenderTimeEnd"] + '&guid='
	+ loginParams["PageGuid"], {
		'Accept':'image/webp,*/*;q=0.8',
		'Accept-Encoding':'gzip,deflate,sdch',
		'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
		'Connection':'keep-alive',
		'Referer':'https//www.prior.by/r/Default.aspx?ReturnUrl=%2fr%2fretail%2f',
		'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36'
	});

	var captchaa;
	if (AnyBalance.getLevel() >= 7) {
		AnyBalance.trace('Пытаемся ввести капчу');
		//var href = getParam(html, null, null, /id="MainContent_loginForm_robotValidate_imgAntiRobot"[^>]*src="([^"]*)/i);
		var captcha = AnyBalance.requestGet(baseurl + 'r/AntiRobotImage.axd?&r=' + Math.random());
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}

	loginParams['ctl00$MainContent$loginForm$tbName'] = prefs.login;
	loginParams['ctl00$MainContent$loginForm$tbPassword'] = prefs.password;
	loginParams['ctl00$MainContent$loginForm$robotValidate$tbAntiRobotKeyword'] = captchaa;
	loginParams['__EVENTTARGET'] = 'ctl00$MainContent$loginForm$rbLogin';

	html = requestPostMultipart(baseurl + 'r/Default.aspx?ReturnUrl=%2fr%2fretail%2f', loginParams, addHeaders({Referer: baseurl + 'r/Default.aspx?ReturnUrl=%2fr%2fretail%2f'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="Error">([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error)) throw new AnyBalance.Error(error, null, true);
		if (error) throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'fio', /<h1>Добрый день,([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	if (prefs.type == 'acc') 
		fetchAcc(html, baseurl, result);
	else 
		fetchCard(html, baseurl, result);
}

function fetchCard(html, baseurl, result) {
	var prefs = AnyBalance.getPreferences();
	if (prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего");

	html = AnyBalance.requestGet(baseurl + 'r/retail/cards/', addHeaders({Referer: baseurl + 'r/retail/'}));
	var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';

	var re = new RegExp('(<tr>(?:[^>]*>){21}[^<]*' + lastdigits + '[\\s\\S]*?</tr>)', 'i');
	var card = getParam(html, null, null, re);
	if(!card)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.lastdigits ? 'карту с последними цифрами ' + prefs.lastdigits : 'ни одной карты'));

	getParam(card, result, 'cardNumber', /(?:[^>]*>){22}([^<]*)/i);
	getParam(card, result, '__tariff', /(?:[^>]*>){22}([^<]*)/i);
	getParam(card, result, 'validto', /(?:[^>]*>){26}([^<]*)/i, replaceTagsAndSpaces, parseDate);
	getParam(card, result, 'balance', /(?:[^>]*>){28}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, ['currency', 'balance'], /(?:[^>]*>){30}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}

function fetchAcc(html, baseurl, result) {
	throw new AnyBalance.Error('Получение данных по счетам еще не поддерживается, свяжитесь с автором провайдера!');
}