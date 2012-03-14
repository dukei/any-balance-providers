/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у Екатеринбургского оператора интернет Convex.

Сайт оператора: http://www.convex.ru
Личный кабинет: https://bill.convex.ru
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

function getTrafficGb(str){
  return parseFloat((parseFloat(str)/1000).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://bill.convex.ru/";


    AnyBalance.setDefaultCharset('windows-1251');

    var html = AnyBalance.requestPost(baseurl, {
        login: prefs.login,
        pwd: prefs.password
    });

    var error = getParam(html, null, null, /<h1>Авторизация в сервере статистики<\/h1>\s*<p>([\s\S]*?)<\/p>/i, [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/, '']);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'userName', /Просмотр отчетов.*?\((.*?)\)/i);
    
    html = AnyBalance.requestGet(baseurl + 'client/'); 

    getParam(html, result, '__tariff', /Тариф в этом месяце.*?<b>(.*?)<\/b>/i);
    getParam(html, result, 'balance', /Текущий остаток на счете:.*?<font[^>]*>(.*?)<\/font>/i, [/\s+/g, ''], parseFloat);

    if(AnyBalance.isAvailable('traffic', 'trafficExternal')){
        html = AnyBalance.requestGet(baseurl + 'user/'); 
        //<td align=right>358 829.00</td><td align=right>182 960.00</td></tr></table>
        getParam(html, result, 'traffic', /<td[^>]*>([^<]*)<\/td><td[^>]*>[^<]*<\/td><\/tr><\/table>/i, [/\s+/g, ''], getTrafficGb);
        getParam(html, result, 'trafficExternal', /<td[^>]*>[^<]*<\/td><td[^>]*>([^<]*)<\/td><\/tr><\/table>/i, [/\s+/g, ''], getTrafficGb);
    }
    
    AnyBalance.setResult(result);
}
