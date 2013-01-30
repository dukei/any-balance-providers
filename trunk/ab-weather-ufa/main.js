/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Температура в Уфе с сайта http://be.bashkirenergo.ru/weather/index.asp
*/

function parseDate(str){
    var matches = str.match(/\[(\d+)\D(\d+)\]\s*(\d+)\D(\d+)\D(\d+)/i);
    var time;
    if(matches){
        time = new Date(+matches[5], +matches[4]-1, +matches[3], +matches[1], +matches[2]).getTime();
        AnyBalance.trace('parsed date ' + new Date(time) + ' from ' + str);
    }
    
    if(!time)
        AnyBalance.trace('can not parse date from ' + str);

    return time;
}

function main(){
	AnyBalance.setDefaultCharset('windows-1251');
        var baseurl = 'http://be.bashkirenergo.ru/weather/';

	var result = {success: true};

        if(AnyBalance.isAvailable('ufa','aer','ste','sal','nef','tuy','ish','kum','bel','sib','uch','mel','dur','yan','aks','kar','mra','isa','bur','fed','bek','tul','pav','mis','kus','pri')){
           var html = AnyBalance.requestGet(baseurl + 'index.asp');
           if(!/ДАННЫЕ НА/i.test(html)){
               AnyBalance.trace(html);
               throw new AnyBalance.Error('Не найдена погода. Похоже, временные проблемы на сайте.');
           }

           getParam(html, result, 'time', /ДАННЫЕ НА([\s\S]*?)<hr[^>]*>/i, replaceTagsAndSpaces, parseDate);

           getParam(html, result, 'ufa', />УФА[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'aer', />Аэропорт 'Уфа'[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'ste', />Стерлитамак[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'sal', />Салават[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'nef', />Нефтекамск[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'tuy', />Туймазы[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'ish', />Ишимбай[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'kum', />Кумертау[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'bel', />Белорецк[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'sib', />Сибай[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'uch', />Учалы[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'mel', />Мелеуз[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'dur', />Дюртюли[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'yan', />Янаул[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'aks', />Аксаково[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'kar', />Караидель[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'mra', />Мраково[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'isa', />Исянгулово[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'bur', />Бурибай[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'fed', />Федоровка[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'bek', />Бекетово[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'tul', />Тюльди[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'pav', />Павловка[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'mis', />Мишкино[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'kus', />Кушнаренково[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'pri', />Прибельский[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        }

        if(AnyBalance.isAvailable('kol','psz','tra','syp','dom')){
           var html = AnyBalance.requestGet(baseurl + 'ufa/index.asp');
           if(!/ДАННЫЕ НА/i.test(html)){
               AnyBalance.trace(html);
               throw new AnyBalance.Error('Не найдена погода. Похоже, временные проблемы на сайте.');
           }

           getParam(html, result, 'time', /ДАННЫЕ НА([\s\S]*?)<hr[^>]*>/i, replaceTagsAndSpaces, parseDate);

           getParam(html, result, 'kol', />Колхозный рынок[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'psz', />ПС Западная[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'tra', />Трамвайная[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'syp', />Сипайлово[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
           getParam(html, result, 'dom', />Дом печати[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        }

	AnyBalance.setResult(result);
}
