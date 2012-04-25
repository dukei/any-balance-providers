﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора Utel.
Utel — это бренд, под которым предоставляются услуги местной, внутризоновой, междугородной и международной связи, 
мобильной и спутниковой связи, широкополосного доступа в Интернет, кабельного и интерактивного телевидения.

Сайт оператора: http://www.u-tel.ru/
Личный кабинет: https://ucabinet.u-tel.ru/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://ucabinet.u-tel.ru/";

    if(prefs.phone && !/^\d+$/.test(prefs.phone)){
	throw new AnyBalance.Error('В качестве номера необходимо ввести все цифры номера, например, 79501234567, или не вводить ничего, чтобы получить информацию по первому номеру.');
    }

    AnyBalance.setDefaultCharset('windows-1251');

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl, {
      LOGIN: prefs.login,
      PASSWORD: prefs.password
    }); //{"X-Requested-With": "XMLHttpRequest"}
    
    var error = getParam(html, null, null, /<h1 class="red">([^<]*)<\/h1>/i, [/^\s+|\s+$/g, '']);
    if(error)
      throw new AnyBalance.Error(error);
    
    var sessionid = getParam(html, null, null, /sessionid:\s*['"]([^'"]*)['"]/);
    if(!sessionid)
      throw new AnyBalance.Error("Could not find session id!");

    var result = {success: true}; //Баланс нельзя не получить, не выдав ошибку!

    var svc = 0;
    if(prefs.phone){
        var rePhone = new RegExp('info&svc=(\\d+)"><strong>' + prefs.phone + '<', 'i');
        svc = getParam(html, null, null, rePhone);
        if(!svc)
	    throw new AnyBalance.Error('Не получается найти номер ' + prefs.phone + ' в этом личном кабинете!');
    }
    
    var html = AnyBalance.requestPost(baseurl + "pages/getinfofornumberfirst.jsp", {
      svc: svc,
      sessionid: sessionid
    }); //{"X-Requested-With": "XMLHttpRequest"}

    if(/<p>Биллинг недоступен/.test(html))
        throw new AnyBalance.Error('Биллинг временно недоступен.');


    getParam(html, result, 'balance', /var\s*balData\s*=\s*parseFloat\('([\-\d\.]+)'\)/, replaceFloat, parseFloat);
    getParam(html, result, 'userName', /Абонент:[\s\S]*?>(.*?)</);
    getParam(html, result, 'status', /Признак активности:[\s\S]*?>(.*?)</);
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?>(.*?)</);
    getParam(html, result, 'phone', /<strong [^>]*id="aliaseLabel"[^>]*>(.*)?</);

    if(AnyBalance.isAvailable('bonus')){
        var html = AnyBalance.requestPost(baseurl + "pages/gsminfo_ajax.jsp", {
          a: 'bonus_programm',
          svc: svc
        }); //{"X-Requested-With": "XMLHttpRequest"}
 
        getParam(html, result, 'bonus', /Текущий баланс[\s\S]*?>\s*(-?\d[\d\.,\s]*)</, replaceFloat, parseFloat);
    }

    if(AnyBalance.isAvailable('gprs')){
        var html = AnyBalance.requestPost(baseurl + "pages/gsminfo_ajax.jsp", {
          a: 'block_packets',
          svc: svc
        }); //{"X-Requested-With": "XMLHttpRequest"}
 
        getParam(html, result, 'gprs', /<input[^>]*id="pack_INETBLOCK[^>]*checked[^>]*>[\s\S]*?Остаток\s*:\s*(-?\d[\d\.,\s]*)/i, replaceFloat, parseFloat);
    }

    AnyBalance.setResult(result);
}
