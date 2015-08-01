/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function gnn(e,x) {
    var f='f',a='a',xx,yy, g='', y, a, b, c, d, s, f, r, e, ee,dd,aa,bb, cc,ss,dd,ff,rr;
    if(x.toString().substr(x.length-1)==f) { xx =e; x*=62789;x-=5682;}
    if(x.toString().substr(x.length-1)==a) { xx=e;y-=3466;y*=4234;}
    for(var i= 0,l=xx.length; i<l;i++) g += '' + xx[l-i-1]; return g;
    ss = 'r'+'e';cc=d-a;ss+='t';ff=a-b;ss+='u';dd=ff;ss+='r';ss+='n';dd*=ff;
    b=cc;cc=a-b-c;ee=e;e=ee*34-e+e/3243+Math.abs(e*34);r=ee;s+=c+d;('g'+'nn'+'('+'"'+ee+'"'+','+1+')');if(x)return ee;cc_=aa;r=ee-r;r=rr;aa-bb;
    var result = r - aa;
    return result;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://www.citilink.ru/";

    AnyBalance.setCookie('www.citilink.ru', 'forceOldSite', '1');

    AnyBalance.setDefaultCharset('windows-1251'); 

	var html = AnyBalance.requestGet(baseurl + 'login/', g_headers);

	var form = getElement(html, /<form[^>]+name="mainForm"[^>]*>/i);
	var action = getParam(form, null, null, /<form[^>]+action="([^"]+)/i);
	var captchaSrc = getParam(form, null, null, /"captchaLogin"[^>]*src="\/([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(!action) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
	}

	var captchaa;
	if(captchaSrc) {
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace('Пытаемся ввести капчу');
			var captcha = AnyBalance.requestGet(baseurl + captchaSrc);
			captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.trace('Капча получена: ' + captchaa);
		}else{
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
	}
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'email') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;
		else if (name == 'captchaLogin')
			return captchaa;

		return value;
	});

	var extraInput = getParam(html, null, null, /\[name=mainForm\]'\)\.append\(([\s\S]*?')\);/);
	AnyBalance.trace('Секретный параметр формы: ' + extraInput);
	var inp = safeEval('return ' + extraInput);
	var name = getParam(inp, null, null, /<input[^>]+name="([^"]*)/, null, html_entity_decode);
	var val = getParam(inp, null, null, /<input[^>]+value="([^"]*)/, null, html_entity_decode);
	params[name] = val;
	
	html = AnyBalance.requestPost(action, params, addHeaders({Referer: baseurl})); 
	
    if(!/\/logout\//i.test(html)){
        var error = getParam(html, null, null, /<p[^>]+class="(?:red|msg-error)"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Логин или пароль неверный/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    html = AnyBalance.requestGet(baseurl + 'profile/', g_headers);
	
    if(!/<h2[^>]*>Закрома/i.test(html))
        throw new AnyBalance.Error('Для пользования этим провайдером прикрепите бонусную карту к личному кабинету.');
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /<h2[^>]*>Закрома<\/h2>(?:[\s\S](?!<\/td>))*?<p[^>]*>\s*(\d+)\s*бонус/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'new', /ожидают начисления([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'num', /(\d+)\s*товар\S* на сумму/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'sum', /\d+\s*товар\S* на сумму([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', [/Статус &laquo;([\s\S]*?)&raquo;? в следующем квартале будет сохранен/i, /Для сохранения статуса([^<]+)по итогам/i], [replaceTagsAndSpaces, /&raquo/ig, '»'], html_entity_decode);

	if(isAvailable(['obrabotannie', 'pomosh', 'reshennie', 'zhalobi', 'rating', 'position', 'nachisleno'])) {
		AnyBalance.trace('Переходим на страницу эксперта..');
		html = AnyBalance.requestGet(baseurl + 'profile/expert/', g_headers);
		
		getParam(html, result, 'obrabotannie', /Количество обработанных вопросов(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'pomosh', /Скольким людям помогли ответы(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'reshennie', /Количество решенных вопросов(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'zhalobi', /Количество жалоб на эксперта(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'rating', /Ваш рейтинг(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'position', /Ваше место(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'nachisleno', /Начислено бонусов(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}
	
    AnyBalance.setResult(result);
}
