/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора Мотив (Пермь, Екатеринбург).

Сайт оператора: http://motivtelecom.ru
Личный кабинет: https://lisa.motivtelecom.ru
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var matches = regexp.exec (html), value;
	if (matches) {
		value = matches[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
	}
      return value
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://ics.activ.kz";

    AnyBalance.setDefaultCharset('utf-8');

    AnyBalance.trace("Trying to enter ics at address: " + baseurl);
    var html = AnyBalance.requestGet(baseurl + "/home.seam");

    if(prefs.lang){
        AnyBalance.trace('Переключаем язык на ' + prefs.lang);
        var href = getParam(html, null, null, new RegExp('<a[^>]+href="([^"]*cabinetactions\\.' + prefs.lang + 'Lang[^"]*)', 'i'), null, html_entity_decode);
        if(href)
            html = AnyBalance.requestGet(baseurl + href);
        else
            AnyBalance.trace('Не удалось найти переключение языка');
    }

    var validation = getParam(html, null, null, /<input[^>]+name="javax\.faces\.ViewState"[^>]*value="([^"]*)/i);
    if(!validation)
        throw new AnyBalance.Error("Не удалось найти форму входа. Сайт изменен?");

    html = AnyBalance.requestPost(baseurl + "/home.seam", {
        myform:'myform',
        'myform:name':'7' + prefs.login,
        'myform:password': prefs.password,
        'myform:login_button': 'OK',
        'javax.faces.ViewState': validation
    }, {'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'});

//    AnyBalance.trace(html);
    
    if(!/identity\.logout/i.test(html)){
       //Хм, он нас почему-то не довел до счета. Попытаемся явно перейти
       var href = getParam(html, null, null, /<a[^>]+href="([^"]*cabinetactions\.toBill[^"]*)/, null, html_entity_decode);
       if(href)
           html = AnyBalance.requestGet(baseurl + href);
    }
    
    if(!/identity\.logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class="errors"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }
    
    var result = {success: true};
    //(?:Теңгерім|Баланс|Balance):
    getParam(html, result, 'balance', /(?:&#1058;&#1077;&#1187;&#1075;&#1077;&#1088;&#1110;&#1084;|&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;|Balance):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //(?:интернет плюс|internet plus)
    getParam(html, result, 'internet_plus', /<td[^>]*id="[^"]*bonusesTbl[^>]*>[^<]*(?:&#1080;&#1085;&#1090;&#1077;&#1088;&#1085;&#1077;&#1090; &#1087;&#1083;&#1102;&#1089;|internet plus)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //(?:Шот қалпы|Статус номера|Account status):
    getParam(html, result, 'status', /(?:&#1064;&#1086;&#1090; &#1179;&#1072;&#1083;&#1087;&#1099;|&#1057;&#1090;&#1072;&#1090;&#1091;&#1089; &#1089;&#1095;&#1077;&#1090;&#1072;|Account status):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var href = getParam(html, null, null, /<a[^>]+href="([^"]*toTariff[^"]*)/, null, html_entity_decode);
    if(href){
        html = AnyBalance.requestGet(baseurl + href);
        getParam(html, result, '__tariff', /<td[^>]*>(.*?)<\/td>\s*<td[^>]*>\s*<a[^>]+href="[^"]*l=tariffs/i, replaceTagsAndSpaces, html_entity_decode);
    }

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

