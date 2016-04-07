/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

var regions = {
	bryansk: getSmorodina,
	volgograd: getVolgograd,
	voronej: getVoronej,
	moscow: getSmorodina,
	kaluga: getSmorodina,
	perm: getSmorodina,
	rostov: getRostov,
	spb: getSPB,
  sever: getSever,
	tver: getTver,
	ufa: getUfa,
	cheboksari: getCheboksari
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var region = prefs.region;

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.region, 'Выберите регион!');

	if(prefs.region == 'cheboksari')
		AB.checkEmpty(prefs.houseNumber, 'Введите номер дома!');
	else
		AB.checkEmpty(prefs.password, 'Введите пароль!');

	if(!regions[region])
		throw new AnyBalance.Error("Регион не найден.");

	var func = regions[region];
	AnyBalance.trace('Регион: ' + region);

	func();
}

function getVolgograd() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://34regiongaz.ru/';
	AnyBalance.setDefaultCharset('windows-1251');

	var html = AnyBalance.requestGet(baseurl + 'cabinet/enter/', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'cabinet/enter/', {
		t0: 't0',
		t1: prefs.login,
		t2: prefs.password,
		send: 'Отправить'
	}, AB.addHeaders({Referer: baseurl + 'cabinet/enter/'}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

		error = AB.getParam(html, null, null, /Ошибки при вводе\. Пожалуйста, проверьте введённые данные и попробуйте ещё раз\./i);
		if(error)
			throw new AnyBalance.Error(error, null, true);

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	AB.getParam(html, result, 'balance', /<td[^>]*class="result"[^>]*>(?:[^](?!<\/td>))*<strong>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'account', /Л\/С №([^,<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /Л\/С №([^,<]+)/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}

function getSmorodina() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://xn--80afn.xn--80ahmohdapg.xn--80asehdb';
	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + '/pages/abonent/login.jsf', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var viewState = AB.getParam(html, null, null, /<input[^]+name="javax.faces.ViewState"[^>]+value="([\s\S]*?)"/i);
	if(!viewState)
		throw  new AnyBalance.Error("Не удалось найти параметр. Сайт изменён?");

	var loginForm = AB.getParam(html, null, null, /<form[^>]+id="f_login_abon"[^>]*>([\s\S]*?)<\/form>/i);
	if(!loginForm)
		throw new AnyBalance.Error("Не удалось найти форму входа. Сайт изменён?");

	var buttonID = AB.getParam(loginForm, null, null, /<button[^>]+id="([\s\S]*?)"/i);
	if(!buttonID)
		throw new AnyBalance.Error("Не удалось найти параметр. Сайт изменён?");

	html = AnyBalance.requestPost(baseurl + '/pages/abonent/login.jsf', [
		['javax.faces.partial.ajax', 'true'],
		['javax.faces.source', buttonID],
		['javax.faces.partial.execute', 'f_login_abon:pLogin'],
		['javax.faces.partial.render', 'f_login_abon'],
		[buttonID, buttonID],
		['f_login_abon', 'f_login_abon'],
		['f_login_abon:eLogin', prefs.login],
		['f_login_abon:ePwd', prefs.password],
		['javax.faces.ViewState', viewState]
	], AB.addHeaders({
		Referer: baseurl + '/pages/abonent/login.jsf?faces-redirect=true',
		'X-Requested-With': 'XMLHttpRequest',
		Origin: baseurl,
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
	}));

	if (!/redirect url/i.test(html)) {
		var error = AB.getParam(html, null, null, /<span[^>]+class="ui-messages-error-detail"[^>]*>([\s\S]*?)\./i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /(Указана неверная комбинация «E-mail - Пароль»|содержит один из запрещенных символов)/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	html = AnyBalance.requestGet(baseurl+'/pages/abonent/lite/accounts/accountInfo.jsf?faces-redirect=true', g_headers);

	AB.getParam(html, result, 'balance', /за период(?:[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'account', /лицевой счет:(?:[^>]*>){3}([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}

function getRostov() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.rostovregiongaz.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + 'lk/', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'auth/ajax/auth.php', {
		'backurl': '/lk/index.php',
		'AUTH_FORM': 'Y',
		'TYPE': 'AUTH',
		'USER_LOGIN': prefs.login,
		'USER_PASSWORD': prefs.password
	}, AB.addHeaders({Referer: baseurl + 'lk/', 'X-Requested-With': 'XMLHttpRequest'}));

	if (html != 'Y') {
		var error = AB.getParam(html, null, null, null, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Личный кабинет для данного абонента/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'lk/', g_headers);

	var result = {success: true};

	AB.getParam(html, result, 'account', /Номер лицевого счета:(?:[^>]*>){1}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'fio', /ФИО:(?:[^>]*>){1}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address', /Адрес установки оборудования:(?:[^>]*>){1}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);

	if(isAvailable(['balance', 'advance'])) {
		html = AnyBalance.requestGet(baseurl + 'lk/balance/', g_headers);
		AB.getParam(html, result, 'balance', /Задолженность(?:[^>]*>){1}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'advance', /Аванс(?:[^>]*>){1}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	}

	AnyBalance.setResult(result);
}

function getSPB() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://cfl.peterburgregiongaz.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + 'fcabinet/mainpage.xhtml', g_headers);

	var viewState = AB.getParam(html, null, null, /"javax\.faces\.ViewState"[^>]*value="([^"]+)/i);
	html = AnyBalance.requestPost(baseurl + 'fcabinet/mainpage.xhtml', {
		'javax.faces.partial.ajax':true,
		'javax.faces.source':'formMain:entryButton',
		'javax.faces.partial.execute':'formMain',
		'javax.faces.partial.render':'formMain',
		'formMain:entryButton':'formMain:entryButton',
		'formMain':'formMain',
		'formMain:userLogin':prefs.login,
		'formMain:userPsw':prefs.password,
		'javax.faces.ViewState': viewState,
	}, addHeaders({
		Referer: baseurl + 'fcabinet/mainpage.xhtml',
		'X-Requested-With':'XMLHttpRequest'
	}));

	var href = AB.getParam(html, null, null, /<redirect url="([^"]+)/i);

	if (!href) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'fcabinet/'+ href, g_headers);

	var result = {success: true};

	var dolg = AB.getParam(html, null, null, /<div class="align-left">([\s\d,.]+)(?:[^>]*>){8}\s*<\/table/i, AB.replaceTagsAndSpaces, AB.parseBalance) * -1;
	var ammount = AB.getParam(html, null, null, /<div class="align-left">([\s\d,.]+)(?:[^>]*>){4}\s*<\/table/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AB.getParam(dolg + ammount, result, 'balance');
	//getParam(html, result, 'dolg', /<div class="align-left">([\d,.]+)(?:[^>]*>){8}\s*<\/table/i, replaceTagsAndSpaces, parseBalance);
	//getParam(html, result, 'balance', /<div class="align-left">([\d,.]+)(?:[^>]*>){4}\s*<\/table/i, replaceTagsAndSpaces, parseBalance);
	AB.getParam(html, result, 'fio', / class="blue2"[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'account', /Лицевой счет №([^<]+)/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}

function getSever() {
  var prefs   = AnyBalance.getPreferences(),
      baseurl = 'https://severrg.ru/';

  AnyBalance.setDefaultCharset('utf-8');

  var html = AnyBalance.requestGet(baseurl + 'CustomerService/Login.aspx', g_headers);

  if(!html || AnyBalance.getLastStatusCode() > 400){
      AnyBalance.trace(html);
      throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

  var params = AB.createFormParams(html, function(params, str, name, value) {
    if (name == 'login')
      return prefs.login;
    else if (name == 'password')
      return prefs.password;

    return value;
  });

  html = AnyBalance.requestPost(baseurl + 'CustomerService/Login.aspx', params, addHeaders({
    'Referer': baseurl + 'CustomerService/Login.aspx'
  }));

  if (!/logout/i.test(html)) {
    var error = AB.getParam(html, null, null, /<td[^>]+error[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
    if (error) {
      throw new AnyBalance.Error(error, null, /Логин или пароль указан неверно/i.test(error));
    }

    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  var result = {success: true};

  AB.getParam(html, result, 'address', /Адрес(?:[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'charged', /Начислено(?:[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, 'paid', /Оплачено(?:[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, 'balance', /Итоговый остаток на счёте(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, 'fio', /Наименование(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);

  AnyBalance.setResult(result);
}

function getTver() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://lk.tverregiongaz.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'login')
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});

	if (/<input[^>]+name="CaptchaCode"/i.test(html)) {
		var captchaSRC = AB.getParam(html, null, null, /<img[^>]+captchaimage[^>]+src="([^"]*)"/i);
		var captchaIMG = AnyBalance.requestGet(baseurl + captchaSRC, g_headers);
		if (captchaIMG) {
			params.CaptchaCode = AnyBalance.retrieveCode("Введите код с картинки.", captchaIMG);
			html = AnyBalance.requestPost(baseurl, params, AB.addHeaders({
				Referer: baseurl
			}))
		}
		else {
			throw new AnyBalance.Error("Капча не найдена.");
		}
	}
	else {
		html = AnyBalance.requestPost(baseurl, params, AB.addHeaders({Referer: baseurl}));
	}

	if (!/exit/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+message_error[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Вы ввели неправильный временный пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	AB.getParam(html, result, 'fio', /абонент:(?:[^>]*>){3}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address', /адрес:(?:[^>]*>){3}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'date', /Дата последней оплаты:([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'balance', /долг(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, [AB.replaceTagsAndSpaces, /^-$/i, '0'], AB.parseBalance);
	AB.getParam(html, result, 'charged', /начислено(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, [AB.replaceTagsAndSpaces, /^-$/i, '0'], AB.parseBalance);
	AB.getParam(html, result, 'recalculation', /перерасчёт(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, [AB.replaceTagsAndSpaces, /^-$/i, '0'], AB.parseBalance);
	AB.getParam(html, result, 'paid', /оплачено(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, [AB.replaceTagsAndSpaces, /^-$/i, '0'], AB.parseBalance);
	AB.getParam(html, result, 'total', /итого(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, [AB.replaceTagsAndSpaces, /^-$/i, '0'], AB.parseBalance);

	AnyBalance.setResult(result);
}

function getUfa() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.bashgaz.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + 'main.php?c=login', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'main.php?c=login', {
		id_rc: prefs.login.substr(0,2),
		login: prefs.login.substr(2),
		password: prefs.password,
	}, AB.addHeaders({
		Referer: baseurl + 'main.php?c=login'
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /Предупреждение:(?:[^>]*>)([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /неправильный логин\/пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	AB.getParam(html, result, 'toPay', /сумма к оплате(?:[^>]*>){3}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'account', /ЛС\s*#([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /ЛС\s*#([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'fio', /<h3[^>]*>([\s\S]*?)<\/h3>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'device', /счетчик\s*№([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'previousCounter', /Предыдущее показание(?:[^>]*>){2}(\d+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'currentCounter', /<input[^>]+name="value"[^>]+value="([^"]*)"/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'date', /Дата предыдущего показания(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseDate);

	AnyBalance.setResult(result);
}

function getCheboksari() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://gmch.ru/';

	var html = AnyBalance.requestGet(baseurl +'user/', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$BodyContener$AccountNumber')
			return prefs.login;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'user/', params, AB.addHeaders({
		Referer: baseurl + 'user/'
	}));

	if (!/подтвердить адрес/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+id="BodyContener_Messege"[^>]*>([\s\S]*?)<br/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /счета нет в базе данных/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$BodyContener$ApartmentFild$SelectFild')
			return prefs.flatNumber;
		else if(name == 'ctl00$BodyContener$ResultApartment')
			return prefs.flatNumber;
		else if(name == 'ctl00$BodyContener$HouseFild$SelectFild')
			return prefs.houseNumber;
		else if(name == 'ctl00$BodyContener$ResultHouse')
			return prefs.houseNumber;
		/**else if(name == 'ctl00$BodyContener$ResultHouseCase')
			return prefs.houseCase;
		else if(name == 'ctl00$BodyContener$ResultRoom')
			return prefs.roomNumber;**/
		else if(name == '__EVENTTARGET')
			return 'ctl00$BodyContener$BtnLogIn';
		return value;
	});

	html = AnyBalance.requestPost(baseurl+'User/', params, AB.addHeaders({
		'Referer': baseurl+'User/'
	}));
	if (!/сохранить/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="MessageText"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте правильность данных/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	AB.getParam(html, result, 'balance', /<div[^>]+class="saldo"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'device', /прибор учета(?:[\s\S]*?<div[^>]*>){6}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'previousCounter', /предыдущее показание(?:[\s\S]*?<div[^>]*>){6}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'currentCounter', /теку(?:[\s\S]*?<div[^>]*>){6}<input[^>]+value="([\s\S]*?)"/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'consumption', /потребление(?:[\s\S]*?<div[^>]*>){6}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'date', /дата(?:[\s\S]*?<div[^>]*>){6}\d+:\d+([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseDate);

	AnyBalance.setResult(result);
}

function getVoronej () {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.vrgaz.ru/lk/';
	AnyBalance.setOptions({forceCharset: 'windows-1251'});

	var html = AnyBalance.requestGet(baseurl+'index.php?page=main', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'avl')
			return prefs.login;
		else if (name == 'avp')
			return prefs.password;

		return value;
	});

	html = AnyBalance.requestPost(baseurl+'index.php?page=main', params, addHeaders({
		Referer: baseurl+'lk/index.php?page=main'
	}));

	if (!/выйти/i.test(html)) {
		var error = AB.getParam(html, null, null, /<p[^>]+class="error-message"[^>]*>([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин и пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	//Получаем ссылку на первый счёт текущего аккаунта.
	var accHREF = AB.getParam(html, null, null, /Список Ваших счетов[\s\S]*?<a[^>]+href="([\s\S]*?)"/i, AB.replaceHtmlEntities);
	if(!accHREF)
		throw  new AnyBalance.Error("Не удалось найти ссылку на счёт. Сайт изменён?");

	html = AnyBalance.requestGet(baseurl + accHREF, g_headers);
	AB.getParam(html, result, 'account', /№ лицевого счета:([\s\S]*?)<\/label/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'fio', /ФИО абонента:([\s\S]*?)<\/label/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address', /<label[^>]+for="id"[^>]*>Адрес:([\s\S]*?)<\/label/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'currentCounter', /<form[^>]+id="myform"[\s\S]*?последние показания:\s*(\d+)/i, AB.replaceTagsAndSpaces);

	var data = AB.getParam(html, null, null, /data(?:\s+|\s*):[\s\S]*?(\[[\s\S]*?\])/i);
	if(!data)
		AnyBalance.trace("Не удалось получить детализацию лицевого счёта. Сайт изменён?");
	else {
		var json = AB.getJsonEval(data);
		AB.getParam(json[0] ? json[0].dt_mes : undefined, result, 'date', null, null, AB.parseDateWord);
		AB.getParam(json[0] ? json[0].Saldo_n : undefined, result, 'paid', null, null, AB.parseBalance);
		AB.getParam(json[0] ? json[0].Nach_mes : undefined, result, 'charged', null, null, AB.parseBalance);
	}

	AnyBalance.setResult(result);
}