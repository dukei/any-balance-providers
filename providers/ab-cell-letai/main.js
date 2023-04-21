
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Origin': 'https://lk.letai.ru/template.LOGIN',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.letai.ru/template.LOGIN/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var type = /@/i.test(prefs.login) ? 'email' : 'phone';

	var form = AB.getElement(html, /<form[^>]+userlogin1/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var someparams = sumParam(html, null, null, /var params\s*=\s*'([^']*)/ig), vgn_nonce;

	for(var i=someparams.length-1; i<someparams.length; ++i){
		vgn_nonce = AnyBalance.requestPost(joinUrl(baseurl, '/portal/util/nonce.jsp?_='+(new Date()).getTime()+Math.random()), someparams[i], addHeaders({
			'Content-Type': 'application/x-www-form-urlencoded',
			'Referer': baseurl
		})).trim();
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'logon') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		} else if(name == 'captcha'){
			var img = getParam(html, null, null, /<img[^>]+src="([^"]*)[^>]*captchaimg/i, replaceHtmlEntities);
			img = AnyBalance.requestGet(joinUrl(baseurl, img), addHeaders({Referer: baseurl}));
			return AnyBalance.retrieveCode('Введите код с картинки', img);
		}

		return value;
	});

	delete params.butt;
	params.VGN_NONCE = vgn_nonce;

	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);

	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, AB.addHeaders({
		Referer: baseurl,
		
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getElement(html, /<span[^>]+color\s*:\s*red/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /учетн|парол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	if(AnyBalance.isAvailable('fio')){
		//Фио появляется после второго запроса почему-то
		html = AnyBalance.requestGet(joinUrl(baseurl, '/home/?v=1'), g_headers);
	}

	var result = {
		success: true
	};

	var divs = getElements(html, /<div[^>]+bank-book[^>]*data-uk-accordion/ig);
	AnyBalance.trace('Найдено ' + divs.length + ' лиц. счетов');
	var found = false;
	

	for(var i=0; i<divs.length; ++i){
		var div = divs[i];
		var num = getParam(div, /accountid=(\d+)/i);
		var phoneNum = getParam(div, null, null, /Мобильная телефония -([^<]*)/i, replaceTagsAndSpaces);
		AnyBalance.trace('Найден лицевой счет ' + num + ' (номер телефона ' + phoneNum + ')');
		if(found)
			continue;

		if(!prefs.num || endsWith(num, prefs.num) || endsWith(phoneNum || '', prefs.num)){
			getParam(num, result, 'licschet');
			getParam(phoneNum && phoneNum.replace(/(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'), result, 'phone');
			getParam(div, result, '__tariff', /(?:тарифный план|Тариф -)([^<]*)/i, replaceTagsAndSpaces);
			getParam(div, result, 'balance', /<div[^>]+widget-price[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
			getParam(div, result, 'abon', /Абонентская плата([^<]*)/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'fio', /<div[^>]+profile-name[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
//			getParam(info, result, 'address', /Адрес подключения:([\s\S]*?)(?:<br|<\/p>)/i, replaceTagsAndSpaces);
			getParam(div, result, 'agreement', /Договор №([^<]*)/i, replaceTagsAndSpaces);
//			getParam(info, result, 'status', /<div[^>]+info_stop-service[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			found = true;;
		}
	}

	if(i >= divs.length && !found){
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти лицевой счет или телефон с последними цифрами ' + prefs.num : 'Не удалось найти ни одного лицевого счета');
	}

	AnyBalance.setResult(result);
}
