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

function mainLK() {
	AnyBalance.trace('Получаем данные из ЛК');

  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');
  var baseurl = "https://ss.zadarma.com/";
  var captchaUrl = 'captcha/index.php?form=login&unq=';

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl + 'auth/', g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  var captchaKey;

  html = AnyBalance.requestPost(baseurl + "auth/login/", {
    redirect: '',
    answer: 'json',
    captcha: captchaKey || '',
    email: prefs.login,
    password: prefs.password
  }, AB.addHeaders({
    Referer: baseurl
  }));

  var json = getJson(html);

  if (!json.success && json.needCaptcha){
  	AnyBalance.trace('Потребовалась капча...');
  	throw new AnyBalance.Error('Задарма потребовал капчу. Вместо входа по логину и паролю получите ключ API и секретный ключ на https://my.zadarma.com/api/ и введите их в настройки провайдера.', null, true);

    captchaKey = captchaAuth(baseurl, captchaUrl);

    html = AnyBalance.requestPost(baseurl + "auth/login/", {
      redirect: '',
      answer: 'json',
      captcha: captchaKey || '',
      email: prefs.login,
      password: prefs.password
    }, AB.addHeaders({
      Referer: baseurl
    }));
    
    json = getJson(html);
  }

  if (!json.success) {
    var error = json.error;

    if (error !== '') {
      throw new AnyBalance.Error(error, null, /найден/i.test(error));
    }

    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  html = AnyBalance.requestGet(baseurl + 'auth/', g_headers);

  var result = {
    success: true
  };

  AB.getParam(html, result, 'balance', /<span class="balance">[^>]*>([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, ['currency', 'balance'], /<span class="balance">[^>]*>([\s\S]*?)<\//i, AB.replaceTagsAndSpaces,
      AB.parseCurrency);
  AB.getParam(html, result, '__tariff', [/<p><strong>(.*)<\/strong>( \((?:стоимость|вартість|cost) \d+\.\d+.*\))<\/p>/i,
    /<h2>Текущий тарифный план<\/h2>\s*<p>\s*<strong>(.*)<\/strong>/i
  ], AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'min', /использовано:[^<]+\[(\d+ мин)/i, AB.replaceTagsAndSpaces, AB.parseMinutes);

  if (isAvailable(['phone0', 'phone0till', 'phone1', 'phone1till', 'phone2', 'phone2till'])) {
    html = AnyBalance.requestGet(baseurl + 'dirnum/', g_headers);
    var numbers = AB.sumParam(html, null, null,
      /<h2[^>]*>(?:Бесплатный|Безкоштовний|Free)(?:[^<](?!c донабором|з донабором|with dtmf))*<\/h2>(?:[^>]*>){20,25}(?:<h2|Номер действителен|Номер діє|The number works)/ig
    );
    for (var i = 0; i < Math.min(numbers.length, 3); ++i) {
      AB.getParam(numbers[i], result, 'phone' + i,
        /(?:Вам подключен прямой номер|Вам надано прямий номер|Your connected number|Вам підключено прямий номер)[^>]*>([\s\S]*?)<\//i,
          AB.replaceTagsAndSpaces);
      AB.getParam(numbers[i], result, 'phone' + i + 'till', /(?:Действует до|Діє до|Valid till)([^<]*)\./i,
          AB.replaceTagsAndSpaces, AB.parseDateISO);
      AB.getParam(numbers[i], result, 'phone' + i + 'status', /(?:Статус)\s*:([^<]*)/i, AB.replaceTagsAndSpaces);
    }
  }

  if (isAvailable(['shortphone0', 'shortphone1', 'shortphone2', 'shortphone3', 'shortphone4'])) {
    html = AnyBalance.requestGet(baseurl + 'mysip/', g_headers);

    var numbers = AB.sumParam(html, null, null, /<li>\s*<a href="#\d+"[^>]*>([^<]*)/ig);
    for (var i = 0; i < Math.min(numbers.length, 5); ++i) {
      AB.getParam(numbers[i], result, 'shortphone' + i, null, AB.replaceTagsAndSpaces);
    }
  }

  AnyBalance.setResult(result);
}

//help func
function captchaAuth(baseurl, captchaUrl) {
  var captcha, captchaKey;
  if (AnyBalance.getLevel() >= 7) {
    AnyBalance.trace('Пытаемся ввести капчу');
    captcha = AnyBalance.requestGet(baseurl + captchaUrl + Math.random(), g_headers);
    captchaKey = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
    AnyBalance.trace('Капча получена: ' + captchaKey);
  } else {
    throw new AnyBalance.Error('Провайдер требует AnyBalance API v7 или выше, пожалуйста, обновите AnyBalance!', null,
      true);
  }
  return captchaKey;
}

function ZadarmaAPI(key, secret){
	var baseurl = 'https://api.zadarma.com';

	function callApi(method, params, requestType /*='get'*/, format /*='json'*/, isAuth /*=true*/){
		if(!requestType)
			requestType = 'get';
	    if(!format)
	    	format = 'json';
	    if(typeof isAuth == 'undefined')
	    	isAuth = true;
	    if(!params)
	    	params = {};

	    params.format = format;
	    var url = baseurl + method;
	    var nobody = /get/i.test(requestType);
	    if(nobody)
	    	url += '?' + getQueryString(params);

	    var str = AnyBalance.requestPost(url, nobody ? '' : params, {
	    	Authorization: isAuth ? getAuthHeaderValue(method, params) : undefined
	    }, {
	    	HTTP_METHOD: requestType
	    });

	    return str;
	}

	function getQueryString(params){
		var ps = [];
		for(p in params){
			ps.push([p, params[p]]);
		}
		ps.sort(function(p1, p2){ return p1[0] > p2[0] ? 1 : (p1[0] < p2[0] ? -1 : 0); });
		var query = [];
		for(var i=0; i<ps.length; ++i){
			query.push(encodeURIComponent(ps[i][0]) + '=' + encodeURIComponent(ps[i][1]));
		}
		var queryString = query.join('&');
		return queryString;
	}

	function getAuthHeaderValue(method, params){
		var queryString = getQueryString(params);
//		AnyBalance.trace('Query string: ' + queryString);
//		AnyBalance.trace('Query string md5: ' + CryptoJS.MD5(queryString));
//		AnyBalance.trace('To hmac: ' + method + queryString + CryptoJS.MD5(queryString));

		var hash = CryptoJS.HmacSHA1(method + queryString + CryptoJS.MD5(queryString), secret);
		hash = hash.toString();
		// Converts a String to word array
		var words = CryptoJS.enc.Utf8.parse(hash); //Они зачем-то hex строку кодируют в base64
		hash = CryptoJS.enc.Base64.stringify(words);

//		AnyBalance.trace('Hmac: ' + hash);
  		return key + ':' + hash;
	}

	return {
		call: function(method, params, requestType){
			var str = callApi(method, params, requestType);
			var json = getJson(str);
			if(json.status != 'success')
				throw new AnyBalance.Error(json.message, null, /Not authorized/i.test(json.message));
			return json;
		}
	};
}

function mainApi() {
	AnyBalance.trace('Получаем данные по API');
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  var api = new ZadarmaAPI(prefs.login, prefs.password);

  var result = {success: true};
  
  var json = api.call('/v1/info/balance/');
  getParam(json.balance, result, 'balance');
  getParam(json.currency, result, ['currency', 'balance']);

  json = api.call('/v1/tariff/');
  getParam(json.info.tariff_name, result, '__tariff');
  getParam(json.info.used_seconds, result, 'min');

  json = api.call('/v1/direct_numbers/');
  for(var i=0; i<json.info.length; ++i){
  	var info = json.info[i];
  	getParam(info.number, result, 'phone' + i);
  	getParam(info.status, result, 'phone' + i + 'status');
  	getParam(info.stop_date, result, 'phone' + i + 'till', null, null, parseDateISO);
  }
  
  json = api.call('/v1/sip/');
  for(var i=0; i<json.sips.length; ++i){
  	var info = json.sips[i];
  	getParam(info.id, result, 'shortphone' + i);
  }

  AnyBalance.setResult(result);
}

function main(){
  var prefs = AnyBalance.getPreferences();
  if(/@/i.test(prefs.login)){
  	//Введен е-мейл
	mainLK();
  }else{
  	mainApi();
  }
}