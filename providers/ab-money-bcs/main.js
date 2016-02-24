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
	var baseurl = 'https://online.bcs.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'bank/web/guest/home', g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	var captchaa = '';;
	if(/Перегрузить картинку/i.test(html)) {
		if(AnyBalance.getLevel() >= 7) {
			AnyBalance.trace('Пытаемся ввести капчу');
			var captcha = AnyBalance.requestGet(baseurl+ 'bank/web/guest/home?p_p_id=LoginPortlet_WAR_bcsinternetserverportalapp&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=captcha&p_p_cacheability=cacheLevelPage&force=' + new Date().getTime());
			captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.trace('Капча получена: ' + captchaa);
		} else {
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
	}

	html = AnyBalance.requestPost(baseurl + 'bank/web/guest/home?p_p_id=LoginPortlet_WAR_bcsinternetserverportalapp&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=login&p_p_cacheability=cacheLevelPage', {
		'login':prefs.login,
		'password':prefs.password,
		'_LoginPortlet_WAR_bcsinternetserverportalapp_captchaText': captchaa
	}, AB.addHeaders({Referer: baseurl + 'bank/web/guest/home', 'X-Requested-With':'XMLHttpRequest'}));
	
	var json = AB.getJson(html);
	
	if (!json.success) {
		var error = json.message && AB.getParam(json.message, null, null, null, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + json.redirect, g_headers);
	
	var result = {success: true},
        plid = getPlid(html);
	
	if(prefs.type == 'brok_acc')
		processBrokerAcc(baseurl, prefs, plid, result);
	else
		processCard(baseurl, prefs, plid, result);
	
	AnyBalance.setResult(result);
}

function processCard(baseurl, prefs, plid, result) {
	var html = AnyBalance.requestPost(
        baseurl + 'bank/c/portal/render_portlet?p_l_id=' + plid + '&p_p_id=AccountListCompactForm_WAR_bcsinternetserverportalapp',
        {},
        AB.addHeaders({Referer: baseurl + 'bank/web/guest/home', 'X-Requested-With':'XMLHttpRequest'})
    );

    var cardRe = new RegExp(
        '<table[^>]*acc-and-card-table">[\\s\\S]*?(<tr[^>]*>[\\s\\S]*?</tr>[\\s\\S]*?"card-name">[^<]*\\*' +
        (prefs.cardnum || '') + '[^>]+>)',
        'i'
    );

	var card = AB.getParam(html, null, null, cardRe);
	if(!card) {
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.cardnum ? 'карту/счет с последними цифрами' + prefs.cardnum: 'ни одной карты или счета!'));
	}

    AB.getParam(card, result, '__tariff', /<td[^>]*>\s*<a[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
    AB.getParam(card, result, 'cardname', /"card-name">([^<]+)/i, AB.replaceTagsAndSpaces);
    AB.getParam(card, result, 'accnumber', /<td[^>]*>\s*<a[^>]*>[^<]*?(\d+)/i, AB.replaceTagsAndSpaces);
    AB.getParam(card, result, 'balance', /<td class="balance">([\s\S]+?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(card, result, ['currency', 'balance'], /<td class="balance">([\s\S]+?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseCurrency);
}

function processBrokerAcc(baseurl, prefs, plid, result) {
	var html = AnyBalance.requestPost(
        baseurl + 'bank/c/portal/render_portlet?p_l_id=' + plid + '&p_p_id=GeneralAgreementListCompactForm_WAR_bcsinternetserverportalapp',
        {},
        AB.addHeaders({Referer: baseurl + 'bank/web/guest/home', 'X-Requested-With':'XMLHttpRequest'})
    );
	
	var acc = AB.getParam(html, null, null, new RegExp('<tr>[\\s\\S]*?(PrimeFaces.ab[^<]*' + (prefs.cardnum || '') + '(?:[^>]*>){12})','i'));
	if(!acc) {
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.cardnum ? 'счет с последними цифрами' + prefs.cardnum: 'ни одного счета!'));
	}

    AB.getParam(acc, result, '__tariff', /(?:[^>]*>)([^>]*>)/i, AB.replaceTagsAndSpaces);
    AB.getParam(acc, result, 'accnumber', /(?:[^>]*>)\D*([^>]*)от/i, AB.replaceTagsAndSpaces);
    AB.getParam(acc, result, 'balance', /balance([^>]*>(?:[^>]*>){5})/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(acc, result, ['currency', 'balance'], /balance([^>]*>(?:[^>]*>){5})/i, AB.replaceTagsAndSpaces, AB.parseCurrency);
}

function getPlid(html) {
    var plid = AB.getParam(html, null, null, /getPlid:function\(\)\{return"(\d+)"/i, AB.replaceTagsAndSpaces);
    if(!plid) {
        throw new AnyBalance.Error('Не удалось найти PLID');
    }
    return plid;
}