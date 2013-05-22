/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у белорусского сотового оператора Velcom.

Сайт оператора: http://velcom.by/
Личный кабинет: https://internet.velcom.by/
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://internet.velcom.by/";
    AnyBalance.setDefaultCharset('windows-1251');

    var matches;
    if(!(matches = /^\+375(\d\d)(\d{7})$/.exec(prefs.login)))
	throw new AnyBalance.Error('Неверный номер телефона. Необходимо ввести номер в международном формате без пробелов и разделителей!');

    var phone = matches[2];
    var prefix = matches[1];
    
    var html = AnyBalance.requestGet(baseurl/* + 'work.html'*/);
    var sid = getParam(html, null, null, /name="sid3" value="([^"]*)"/i);
    if(!sid)
	throw new AnyBalance.Error('Не удалось найти идентификатор сессии!');
    
    var form = getParam(html, null, null, /(<form[^>]*name="mainForm"[^>]*>[\s\S]*?<\/form>)/i);
    if(!form)
	throw new AnyBalance.Error('Не удалось найти форму входа, похоже, velcom её спрятал. Обратитесь к автору провайдера.');

    var $form = $(form);
    var params = {};
    $form.find('input, select').each(function(index){
	var $inp = $(this);
	var id=$inp.attr('id');
	var value = $inp.attr('value');
	if(id){
		if(/PRE/i.test(id)){ //Это префикс
			value = prefix;
		}else if(/NUMBER/i.test(id)){ //Это номер
			value = phone;
		}else if(/PWD/i.test(id)){ //Это пароль
			value = prefs.password;
		}
	}
	var name = $inp.attr('name');
	if(!name)
		return;
	if(name == 'sid3')
		sid = value;
	if(name == 'user_input_0')
		value = '_next';
	if(name == 'user_input_timestamp')
		value = new Date().getTime();
	if(name == 'user_input_8')
		value = '5';
	if(name == 'user_input_9')
		value = '2';
	if(name == 'user_input_10')
		value = '0';
	params[name] = value || '';
    });

    var required_headers = {
	'Origin': 'https://internet.velcom.by',
	'Referer': 'https://internet.velcom.by/work.html',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.162 Safari/535.19'
    };
    
    var html = requestPostMultipart(baseurl + 'work.html', params, required_headers);

    if(!/_root\/MENU0/i.test(html)){
        var error = sumParam(html, null, null, /<td[^>]+class="INFO(?:_Error|_caption)?"[^>]*>(.*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    var html = requestPostMultipart(baseurl + 'work.html', {
        sid3: sid,
        user_input_timestamp: new Date().getTime(),
        user_input_0: '_root/MENU1/USER_INFO',
        last_id: ''
    }, required_headers);
         
    getParam(html, result, 'userName', /ФИО:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'userNum', /(?:номер клиента|Номер телефона):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /(?:Текущий баланс|Баланс):[\s\S]*?<td[^>]*>(-?\d[\s\d,\.]*)/i, replaceFloat, parseFloat);
    getParam(html, result, 'status', /(?:Текущий статус абонента|Статус абонента):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'min', /Остаток минут, SMS, MMS, GPRS, включенных в абонплату:[\s\S]*?<td[^>]*>(?:[\s\S](?!<\/td>))*?(-?\d[\d,\.]*) мин(?:,|\s*<)/i, replaceFloat, parseFloat);
    getParam(html, result, 'min_fn', /Остаток минут, SMS, MMS, GPRS, включенных в абонплату:[\s\S]*?<td[^>]*>(?:[\s\S](?!<\/td>))*?(-?\d[\d,\.]*) мин на ЛН/i, replaceFloat, parseFloat);
    getParam(html, result, 'min_velcom', /Остаток минут, SMS, MMS, GPRS, включенных в абонплату:[\s\S]*?<td[^>]*>(?:[\s\S](?!<\/td>))*?(-?\d[\d,\.]*) мин на velcom/i, replaceFloat, parseFloat);

    getParam(html, result, 'traffic', /Остаток минут, SMS, MMS, GPRS, включенных в абонплату:[\s\S]*?<td[^>]*>(?:[\s\S](?!<\/td>))*?(-?\d[\d,\.]*)\s*Мб/i, replaceFloat, parseFloat) || 0;
/*
    if(AnyBalance.isAvailable('traffic')){
        html = requestPostMultipart(baseurl + 'work.html', {
            sid3: sid,
            user_input_timestamp: new Date().getTime(),
            user_input_0: '_root/TPLAN/PACKETS',
            last_id: '',
            user_input_1: -1
        }, required_headers);

        var packetMb = getParam(html, null, null, /Остаток интернет-трафика:[^<]*?(\d+)\s*Мб/i, replaceFloat, parseFloat) || 0;
        var packetKb = getParam(html, null, null, /Остаток интернет-трафика:[^<]*?(\d+)\s*Кб/i, replaceFloat, parseFloat) || 0;

        result.traffic = traffic + packetMb + packetKb/1000;
    }
*/    
    AnyBalance.setResult(result);
}
