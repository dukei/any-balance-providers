/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Юникредит

Сайт оператора: http://www.unicreditbank.ru/rus/index.wbp
Личный кабинет: https://enter2.unicredit.ru/
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

var replaceTagsAndSpaces = [/\\n/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var _text = text.replace(/\s+/, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    text = text.replace(/\s+/, '');
    var val = getParam(text, null, null, /-?\d[\d\.,]*\s*(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function parseDate(str){
    AnyBalance.trace('Parsing date from value: ' + str);
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    return time;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    processUnicredit();
}

function fnRnd(){
	var now=new Date(); 
	return 'B'+(Date.parse(now.toGMTString())+now.getMilliseconds()).toString(32);
}

function processUnicredit(){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/\d{4}/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    //Для демо-режима - "http://demo.enter.unicredit.ru/v1/cgi/bsi.dll";
    var baseurl = "https://enter2.unicredit.ru/v1/cgi/bsi.dll";
    
    var html = AnyBalance.requestPost(baseurl, {
        T:'RT_2Auth.CL',
        IMode:'',
        L:'russian',
        A:prefs.login,
        B:prefs.password,
        token:fnRnd(),
        _PresentationType:'',
        ForceSave:'',
        PostSave:'',
        iiStepSaveForm:''
    });

    var error = getParam(html, null, null, /<div id="error">\d*\|?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);
    
    var $html = $(html);
    var sid = $html.find('sid').attr('v');
    if(!sid)
        throw new AnyBalance.Error('Не удаётся найти идентификатор сессии!');
    
    html = AnyBalance.requestGet(baseurl + '?sid=' + sid + '&t=RT_2IC.form&SCHEMENAME=moneypage&TbSynchToken=*tbimg2*');
    $html = $(html);
    
    var $card = prefs.cardnum ? $html.find('div[p=CARD][ID$='+prefs.cardnum+']').first() : $html.find('div[p=CARD]').first();
    if(!$card.size())
        throw new AnyBalance.Error(prefs.cardnum ? 'Не удаётся найти карту с последними цифрами ' + prefs.cardnum : 'Не удаётся найти ни одной карты');
    
    var result = {success: true};
    if(AnyBalance.isAvailable('balance'))
        result.balance = parseBalance($card.find('U.Ucolor1').text());
    if(AnyBalance.isAvailable('currency'))
        result.currency = parseCurrency($card.find('U.Ucolor1').text());
    
    getParam($card.html(), result, 'type', /<\/div>([^<]*)/i, replaceTagsAndSpaces);
    getParam($card.html(), result, 'cardnum', /№([^<]*)/i, replaceTagsAndSpaces);
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

