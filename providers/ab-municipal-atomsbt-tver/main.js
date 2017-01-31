/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.tver.atomsbt.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}


	var captchaSRC = getParam(html, null, null, /<div[^>]+class="vpb_captcha_wrapper"[^>]*>[\s\S]*?<img src="([\s\S]*?)"/i);
	if (!captchaSRC)
		throw new AnyBalance.Error("Не удалось найти капчу. Сайт изменён?");
	var captchaIMG = AnyBalance.requestGet(joinUrl(baseurl, captchaSRC), addHeaders({
		Accept: 'image/webp,image/*,* /*;q=0.8',
		Referer: baseurl
	}));
		var captchaResponse = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки.', captchaIMG);
		html = AnyBalance.requestPost(baseurl + 'lib/js/captcha/captcha_checker.php', {
			vpb_captcha_code: captchaResponse
		}, addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			'Accept': '* /*'
		}));
		if (!/1/.test(html))
			throw new AnyBalance.Error("Введенный Вами код неправильный");
		else
			html = AnyBalance.requestPost(baseurl + 'page.php?page=lk-ls-info', {
				ls: prefs.login,
				pwd: prefs.password,
				vpb_captcha_code: captchaResponse,
				saction: 'lspwd'
			}, addHeaders({Referer: baseurl}));



	if (!/exit/i.test(html)) {
		var error = getElement(html, /<div[^>]+login_response/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'adress', /<div[^>]*divtext[^>]*>\s*Информация[\s\S]*?<div[^>]+info-text[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
 	getParam(html, result, '__tariff', /(?:Долг|Переплата) на 01\.(\d\d\.\d\d)/i);

    getParam(html, result, 'saldo', /<div[^>]*divtext[^>]*>\s*Баланс счета[\s\S]*?<div[^>]+font-size:\s*18px[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'in_saldo', /(?:Долг|Переплата) на[\s\S]*?<div[^>]+balans-money[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'accrued', /Начислено:[\s\S]*?<div[^>]+balans-money[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'paid', /Оплачено в текущем месяце:[\s\S]*?<div[^>]+balans-money[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam('15.'+ result.__tariff, result, 'period', null, null, parseDate);

  if(isAvailable('device_value')) {
    html = AnyBalance.requestGet(baseurl + 'page.php?page=lk-hist-counter', g_headers);
    getParam(html, result, 'device_value', /История показаний приборов учета(?:[\s\S]*?<td[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
  }
	
	AnyBalance.setResult(result);
}