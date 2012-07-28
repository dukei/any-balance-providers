/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у питерского интернет, телефония, тв - провайдера Твоё ТВ.

Сайт оператора: http://www.spb.tvoe.tv
Личный кабинет: http://www.spb.tvoe.tv/cabinet/
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

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

g_services = {
    tv: {
       name: 'Твоё ТВ',
       section: /<img[^>]*src="\.\/i\/logo-tv-grey\.jpg"[^>]*>([\s\S]*?)(?:<img[^>]*src="\.\/i\/logo-(?:inet|tv|phone)-grey\.jpg"[^>]*>|$)/
    },
    inet: {
       name: 'Твой Интернет',
       section: /<img[^>]*src="\.\/i\/logo-inet-grey\.jpg"[^>]*>([\s\S]*?)(?:<img[^>]*src="\.\/i\/logo-(?:inet|tv|phone)-grey\.jpg"[^>]*>|$)/
    },
    phone_local: {
       name: 'Твой Телефон (местные вызовы)',
       section: /<img[^>]*src="\.\/i\/logo-phone-grey\.jpg"[^>]*>([\s\S]*?)(?:<img[^>]*src="\.\/i\/logo-(?:inet|tv|phone)-grey\.jpg"[^>]*>|$)/,
       subsection: /<th[^>]*class="[^"]*header[^>]*>\s*местная связь([\s\S]*?)(?:<th[^>]*class="[^"]*header[^>*]>|$)/i
    },
    phone_inter: {
       name: 'Твой Телефон (междугородние/международные)',
       section: /<img[^>]*src="\.\/i\/logo-phone-grey\.jpg"[^>]*>([\s\S]*?)(?:<img[^>]*src="\.\/i\/logo-(?:inet|tv|phone)-grey\.jpg"[^>]*>|$)/,
       subsection: /<th[^>]*class="[^"]*header[^>]*>\s*междугородняя\/международная связь([\s\S]*?)(?:<th[^>]*class="[^"]*header[^>*]>|$)/i
    }
};

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.spb.tvoe.tv/cabinet/";

    var html = AnyBalance.requestPost(baseurl, {
        login: prefs.login,
        password: prefs.password,
        submit: 'Продолжить'
    });

    //AnyBalance.trace(html);
    var error = getParam(html, null, null, /(<form[^>]*name="auth")/i);
    if(error)
        throw new AnyBalance.Error("Не удаётся войти в личный кабинет. Неправильный логин/пароль?");

    var result = {success: true};

    getParam(html, result, 'userName', /<h3>Абонент<\/h3>[\s\S]*?<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    var what = prefs.what || 'tv';
    if(!g_services[what])
        what = 'tv';

    var service = g_services[what];
    var serviceBody = getParam(html, null, null, service.section);
    if(!serviceBody)
        throw new AnyBalance.Error('Не удалось найти информацию по сервису ' + service.name);

    getParam(serviceBody, result, 'agreement', /Договор №[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    if(service.subsection)
        serviceBody = getParam(serviceBody, null, null, service.subsection);
    
    if(!serviceBody)
        throw new AnyBalance.Error('Не удалось найти детальную информацию по сервису ' + service.name);

    result.__tariff = service.name;
    getParam(serviceBody, result, 'balance', /Баланс:[\s\S]*?<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(serviceBody, result, 'credit', /Кредит:[\s\S]*?<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(serviceBody, result, 'status', /Статус:[\s\S]*?<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

