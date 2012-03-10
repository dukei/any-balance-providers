/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора Utel.
Utel — это бренд, под которым предоставляются услуги местной, внутризоновой, междугородной и международной связи, 
мобильной и спутниковой связи, широкополосного доступа в Интернет, кабельного и интерактивного телевидения.

Сайт оператора: http://www.u-tel.ru/
Личный кабинет: https://ucabinet.u-tel.ru/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && !AnyBalance.isAvailable (param))
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

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://ucabinet.u-tel.ru/";

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
    
    var html = AnyBalance.requestPost(baseurl + "pages/getinfofornumberfirst.jsp", {
      svc: 0,
      sessionid: sessionid
    }); //{"X-Requested-With": "XMLHttpRequest"}

    getParam(html, result, 'balance', /var\s*balData\s*=\s*parseFloat\('([\-\d\.]+)'\)/, null, parseFloat);
    getParam(html, result, 'userName', /Абонент:[\s\S]*?>(.*?)</);
    getParam(html, result, 'status', /Признак активности:[\s\S]*?>(.*?)</);
    result.__tariff = getParam(html, null, null, /Тарифный план:[\s\S]*?>(.*?)</);

    if(AnyBalance.isAvailable('bonus')){
        var html = AnyBalance.requestPost(baseurl + "pages/gsminfo_ajax.jsp", {
          a: 'bonus_programm',
          svc: 0
        }); //{"X-Requested-With": "XMLHttpRequest"}
 
        getParam(html, result, 'bonus', /Текущий баланс[\s\S]*?>(.*?)</);
    }

    AnyBalance.setResult(result);
}
