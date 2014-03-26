/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у казанского интернет-провайдера Телесет (Ростелеком)

Сайт оператора: http://telecet.ru
Личный кабинет: http://lk.telecet.ru
*/

function main(){
	throw new AnyBalance.Error("Провайдер больше не работает, воспользуйтесь провайдером Ростелеком (единый кабинет)");
	
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('ISO-8859-5');

    var baseurl = "http://lk.telecet.ru/contract/!w3_p_main.showform";

    var html = AnyBalance.requestPost(baseurl, {
        USERNAME:prefs.login,
        PASSWORD:prefs.password,
        FORMNAME:'QFRAME',
        CONFIG:'CONTRACT',
        NLS:'WR',
        submit:'Войти'
    });

    var sid = getParam(html, null, null, /sid=([0-9a-f]+)/i);
    if(!sid){
        var error = getParam(html, null, null, /<div[^>]+ErrorText[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    html = AnyBalance.requestGet(baseurl + '?FORMNAME=QFRAME&CONFIG=CONTRACT&SID=' + sid + '&NLS=WR');
    var contr_id = getParam(html, null, null, /CONTR_ID=(\d+)/i);
    if(!contr_id)
        throw new AnyBalance.Error('Не удаётся найти идентификатор договора. Сайт изменен?');

    html = AnyBalance.requestGet(baseurl + '?FORMNAME=QCURRACC&CONTR_ID=' + contr_id + '&SID=' + sid + '&NLS=WR');

    var result = {success: true};

    getParam(html, result, 'balance', /Текущий баланс[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'topay', /Рекомендуемая сумма платежа:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', /Состояние счёта по договору №([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /Клиент:([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    //Пытаемся найти тарифный план
    //Загружаем меню
    html = AnyBalance.requestGet(baseurl + '?FORMNAME=QMAINMENU&OPENED=R!ACC' + contr_id + '!&ROOTMENUITEM=ROOT&SID=' + sid + '&NLS=WR');
    getParam(html, result, '__tariff', /<a[^>]+class="[^"]*SERVICE[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('traffic')){
        var data = {baseurl: baseurl, sid: sid, contr_id: contr_id, result: result, available_obj_ids: {}, opened_obj_ids: {}};
        if(!findTraffic(html, null, data))
            AnyBalance.trace('Ссылку на трафик найти не удалось... Возможно, вам следует отключить получение информации о трафике.');
    }
    
    AnyBalance.setResult(result);
}

//Ищет трафик в меню, открывая последовательно пункты услуг в меню
function findTraffic(html, obj_id, data){
    if(obj_id){
        var trafficLink = getParam(html, null, null, /'([^']*QSUMMARY4LL[^']*)/i, replaceSlashes);
        if(trafficLink){
            AnyBalance.trace('Ссылка на трафик найдена, получаем...');
            html = AnyBalance.requestGet(data.baseurl + '?FORMNAME=QSUMMARY4LL&CONTR_ID=' + data.contr_id + '&OBJ_ID=' + obj_id + '&SID=' + data.sid + '&NLS=WR');
            getParam(html, data.result, 'traffic', /Итого:(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            return true;
        }
    }

    var services = sumParam(html, null, null, /<a[^>]+class="[^"]*SERVICE[^>]*OBJ_ID=(\d+)/ig);
    for(var i=0; i<services.length; ++i){
        var obj_id = services[i];
        data.available_obj_ids[obj_id] = true;
        
        if(!isset(data.opened_obj_ids[obj_id])){
            data.opened_obj_ids[obj_id] = true;
            var name = getParam(html, null, null, new RegExp('<a[^>]+&OBJ_ID='+obj_id+'\\D[^>]*>([\\S\\s]*?)</a>', 'i'), replaceTagsAndSpaces, html_entity_decode);
            AnyBalance.trace('Пытаемся найти трафик в услуге ' + name + ' (' + obj_id + ')');
            var _html = AnyBalance.requestGet(data.baseurl + '?FORMNAME=QMAINMENU&ROOTMENUITEM=ROOT&NLS=WR&SID=' + data.sid + '&OPENED=R!O' + data.contr_id + '!O' + obj_id + '!');
            if(findTraffic(_html, obj_id, data))
                return true;
        }
    }
    
    return false;
}
