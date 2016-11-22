
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	Origin: 'https://newlk.letai.ru:8443',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://newlk.letai.ru:8443/template.LOGIN/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var type = /@/i.test(prefs.login) ? 'email' : 'phone';

	var form = AB.getElement(html, type == 'phone' ? /<form[^>]+userlogin1/i : /<form[^>]+userlogin2/i);
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
		var error = AB.getElement(html, /<p[^>]+class="error"/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
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

	var divs = getElements(html, /<div[^>]+card_litz_scheta/ig);
	AnyBalance.trace('Найдено ' + divs.length + ' лиц. счетов');
	var found = false;
	

	for(var i=0; i<divs.length; ++i){
		var div = divs[i];
		var num = getElement(div, /<p[^>]+number/i, [/№/i, '', replaceTagsAndSpaces]);
		var phoneNum = getParam(div, null, null, /Номер телефона:([\s\S]*?)(?:<br|<\/p>)/i, replaceTagsAndSpaces);
		AnyBalance.trace('Найден лицевой счет ' + num + ' (номер телефона ' + phoneNum + ')');
		if(found)
			continue;

		var info = getElement(div, /<div[^>]+item_tarif/i);
		if(!prefs.num || endsWith(num, prefs.num) || endsWith(phoneNum || '', prefs.num)){
			getParam(num, result, 'licschet');
			getParam(phoneNum, result, 'phone');
			getParam(div, result, 'balance', /<span[^>]+balans[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
			getParam(info, result, 'abon', /Абонентская плата:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
			getParam(info, result, 'fio', /Клиент:([\s\S]*?)(?:<br|<\/p>)/i, replaceTagsAndSpaces);
			getParam(info, result, 'address', /Адрес подключения:([\s\S]*?)(?:<br|<\/p>)/i, replaceTagsAndSpaces);
			getParam(info, result, 'agreement', /дата договора:([\s\S]*?)(?:<br|<\/p>)/i, replaceTagsAndSpaces);
			getParam(info, result, '__tariff', /<h2[^>]*>([\s\S]*?)(?:<\/h2>|<\/a>)/i, replaceTagsAndSpaces);
			getParam(info, result, 'status', /<div[^>]+info_stop-service[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			found = true;;
		}
	}

	if(i >= divs.length && !found){
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти лицевой счет или телефон с последними цифрами ' + prefs.num : 'Не удалось найти ни одного лицевого счета');
	}

	AnyBalance.setResult(result);
}
