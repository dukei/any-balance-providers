/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent':'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)'
};

function createParams(params){
    var str = '';
    for(var param in params){
        str += str ? '&' : '?';
        str += encodeURIComponent(param);
        str += '=';
        str += /*encodeURIComponent(*/params[param]/*)*/;
    }
    return str;
}

function number2(num){
    return (num < 10 ? '0' : '') + num;
}

function formatCurTime(){
    var dt = new Date();
    return '' + dt.getFullYear() + number2(dt.getMonth()+1) + number2(dt.getDate()) + number2(dt.getHours()) + number2(dt.getMinutes()) + number2(dt.getSeconds());
}

function getMyJson(str){
    var json = getJson(str);
    if(!json.success){
        if(json.error)
            throw new AnyBalance.Error(json.error);
        throw new AnyBalance.Error('Не удалось получить данные из личного кабинета! Изменения на сервере?');
    }
    return json;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://bt.bigtelecom.ru/index.php";
    AnyBalance.setDefaultCharset('utf-8'); 
 
    var params = {
        r: 'client/beginsession',
        login: prefs.login,
        password: hex_md5('\x0f\n\t\x0b' + prefs.password)
    };

    var html = AnyBalance.requestPost(baseurl + createParams(params), params, g_headers);

    var json = getMyJson(html);
    var skey = json.skey;

    html = AnyBalance.requestGet(baseurl + createParams({
	platform: 'android',
        date: 0,
        skey: skey,
        r: 'client/getfullinfo'
    }), g_headers);

    json = getMyJson(html);
    
    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(''+json.balance, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(''+json.shouldPay, result, '2pay', null, replaceTagsAndSpaces, parseBalance);
    getParam(''+json.contractId, result, 'licschet', null, replaceTagsAndSpaces, html_entity_decode);
	
    for(var i = 0; json.clientinfo && i < json.clientinfo.length; ++i){
        var info = json.clientinfo[i];
		
        sumParam(info.rateName || info.rateClass, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
        sumParam(''+info.cost, result, 'abon', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    }
	
    //Возвращаем результат
    AnyBalance.setResult(result);           	
}