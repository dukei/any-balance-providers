/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у Екатеринбургского оператора интернет Кабinet.

Сайт оператора: http://www.telenet.ru
Личный кабинет: https://stat.telenet.ru
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

    var baseurl = "https://stat.telenet.ru/";

    var html = AnyBalance.requestPost(baseurl + 'login', {
        login: prefs.login,
        password: prefs.password
    });

    var error = getParam(html, null, null, /<div class="error">([\s\S]*?)<\/div>/i, [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''], html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[\s\S]*?(-?\d[\d\.,\s]*)/i, [/\s+/g, '', /,/g, '.'], parseFloat);
    getParam(html, result, 'threshold', /Порог отключения:[\s\S]*?(-?\d[\d\.,\s]*)/i, [/\s+/g, '', /,/g, '.'], parseFloat);
    var ticket = getParam(html, null, null, /\?ticket=([^"]+)"/i);

    if(AnyBalance.isAvailable('bonus')){
        html = AnyBalance.requestGet(baseurl + 'friends.cgi?ticket='+ticket); 
        getParam(html, result, 'bonus', /<b>ИТОГО[\s\S]*?(-?\d[\d\.,\s]*)/i, [/\s+/g, '', /,/g, '.'], parseFloat);
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

