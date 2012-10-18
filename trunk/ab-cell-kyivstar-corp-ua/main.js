/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Киевстар корпоративный (Украина).

Сайт оператора: http://my.kyivstar.ua/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    
    var baseurl = "https://my.kyivstar.ua/";
    var headers = {
      'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
      'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
      Connection: 'keep-alive'
    };

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "tbmb/login/perform.do", {
        isSubmitted: "true",
        user: prefs.login,
        password: prefs.password
    }, headers);
    
    if(!/\/tbmb\/logout\/perform/i.test(html)){
        var matches = html.match(/<td class="redError">([\s\S]*?)<\/td>/i);
        if(matches){
            throw new AnyBalance.Error(matches[1]);
        }
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    if(/\/tbmb\/payment\/activity\//i.test(html)){
        //Нашли ссылку на платежи. Очень вероятно, что это физический аккаунт
        throw new AnyBalance.Error("Похоже, у вас не корпоративный личный кабинет. Пожалуйста, воспользуйтесь провайдером Киевстар для некорпоративных тарифов");
    }

//    AnyBalance.trace(html);
    
    var hierarchy = AnyBalance.requestGet(baseurl + "tbmb/flash/hierarchy?action=hier");
//    AnyBalance.trace(hierarchy);

    //<hh><h id='4199266' type='BILLING' name='Billing Hierarchy'><n i='4199267' t='1' v='Billing Hierarchy'><n i='8974631' t='1' virt='0' v='2802451'><n i='17496882' t='3' virt='0' v='4654037' c='' m='+380673401254'/></n></n></h></hh>
    var $hierarchy = $(hierarchy);
    var hierid = $hierarchy.find("h").attr('id');
    var nodeid_info = $hierarchy.find('n[m="'+prefs.login+'"]').attr('i');
    var nodeid_balance = $hierarchy.find('n[m="'+prefs.login+'"]').parent().attr('i');
    var nodeid_services = $hierarchy.find('n[m="'+prefs.login+'"]').attr('v');
    
    var result = {success: true};
    
    if(AnyBalance.isAvailable('costs', 'balance')){
        var balance_html = AnyBalance.requestGet(baseurl + "tbmb/flash/hierarchy?action=charges&nodeId=" + nodeid_balance + "&hierId=" + hierid);
//        AnyBalance.trace(balance_html);
        //<cc i='8974631'><c i='17496882' c='87.65'/></cc>
	if(AnyBalance.isAvailable('costs')){
            var costs = parseFloat($(balance_html).find('c').attr('c'));
            if(costs)
                result.costs = costs;
	}
	if(AnyBalance.isAvailable('balance')){
            var balance = parseFloat($(balance_html).find('c[b]').attr('b'));
	    if(balance)
                result.balance = balance;
	}
    }

    //https://my.kyivstar.ua/tbmb/flash/hierarchy?action=mtninfo&hierId=4199266&nodeId=17496882&time=261
    var info_html = AnyBalance.requestGet(baseurl + "tbmb/flash/hierarchy?action=mtninfo&nodeId=" + nodeid_info + "&hierId=" + hierid);
//    AnyBalance.trace(info_html);
    var $info = $(info_html);
    
    result.__tariff = $info.find('rp').text();
    
    if(AnyBalance.isAvailable('statuslock')){
        var val = $info.find('status').text();
        if(val)
            result.statuslock = val;
    }
    
    if(AnyBalance.isAvailable('min_left')){
        //bonuses bonus name:contains("Остаток минут для звонков на номера абонентов по Украине"), 
        var val = $info.find('bonuses bonus name:contains("Остаток минут"):contains("по Украине"),\n\
                              bonuses bonus name:contains("Залишок хвилин"):contains("по Україні"),\n\
                              bonuses bonus name:contains("Balance of minutes"):contains("in Ukraine")').next().text();
        if(val){
            var matches = val.match(/(\d+)/);
            if(matches)
                result.min_left = parseInt(matches[1]);
        }
    }
    
    if(AnyBalance.isAvailable('min_group')){
        var val = $info.find('bonuses bonus name:contains("Остаток минут"):contains("абонентской группы"),\n\
                              bonuses bonus name:contains("Залишок хвилин"):contains("абонентської групи"),\n\
                              bonuses bonus name:contains("Balance of minutes"):contains("subscriber group")').next().text();
        if(val){
            var matches = val.match(/(\d+)/);
            if(matches)
                result.min_group = parseInt(matches[1]);
        }
    }
    
    if(AnyBalance.isAvailable('traffic_left')){
        var val = $info.find('bonuses bonus name:contains("GPRS"), bonuses bonus name:contains("MB")').next().text();
        if(val){
            var matches = val.match(/([\d\.]+)/);
            if(matches)
                result.traffic_left = parseFloat(matches[1]);
        }
    }
    
    if(AnyBalance.isAvailable('sms_left')){
        var val = $info.find('bonuses bonus name:contains("Остаток SMS"),\n\
                              bonuses bonus name:contains("Залишок SMS"),\n\
                              bonuses bonus name:contains("Balance SMS")').next().text();
        if(val){
            var matches = val.match(/(\d+)/);
            if(matches)
                result.sms_left = parseInt(matches[1]);
        }
    }

    if(AnyBalance.isAvailable('mms_left', 'bonus_available')){
        AnyBalance.trace('Проверяем, не подключены ли какие акции...');
        var html = AnyBalance.requestGet(baseurl + "tbmb/flash/goto.do?action=features&subs=" + nodeid_services);
        //ММС пакет
        var url = getParam(html, null, null, /(?:Подключенные акции|Підключені акції|Activated offers)[\s\S]*?(?:Пакет MMS|Пакет MMS|MMS Pack)(?:[\s\S](?!<\/td>))*?<a[^>]+href="\/([^"]*)"[^>]*class="changeLink"/i, null, html_entity_decode);
        if(url && AnyBalance.isAvailable('mms_left')){
            AnyBalance.trace('Найден Пакет ММС...');
            var html_val = AnyBalance.requestGet(baseurl + url);
            getParam(html_val, result, 'mms_left', /(?:остаток MMS|залишок MMS|Balance MMS):([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        }
        //Программа благодарности "Киевстар бизнес-клуб"
        var url = getParam(html, null, null, /(?:Подключенные акции|Підключені акції|Activated offers)[\s\S]*?(?:Программа благодарности[^<]*Киевстар бизнес-клуб|Програма подяки[^>]*Київстар бізнес клуб|Kyivstar Business Club)(?:[\s\S](?!<\/td>))*?<a[^>]+href="\/([^"]*)"[^>]*class="changeLink"/i, null, html_entity_decode);
        if(url && AnyBalance.isAvailable('bonus_available')){
            AnyBalance.trace('Найден Киевстар бизнес-клуб...');
            var html_val = AnyBalance.requestGet(baseurl + url);
            getParam(html_val, result, 'bonus_available', /(?:Доступно бонусов для списания|Доступно бонусів для списання|Available bonuses for discarding):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        }
    }
    
    AnyBalance.setResult(result);
}


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

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

