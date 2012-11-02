﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет Домолинк
Сайт оператора: http://www.domolink.ru/
Личный кабинет: https://room.centertelecom.ru
*/
var regions = {
    msk: domolinkcenter,// Личный кабинет Московского филиала
    lpc: domolinkcenter, // Личный кабинет Липецого филиала
    klg: domolinkcenter, // Личный кабинет Калужского филиала
    blg: domolinkcenter, // Личный кабинет Белгородского филиала
    krs: domolinkcenter, // Личный кабинет Курского филиала
    tvr: domolinkcenter, // Личный кабинет Тверского филиала
    vrn: domolinkcenter, // Личный кабинет Воронежского филиала

    tula: domolinktula, // Личный кабинет абонентов Домолинк Тула
    nnov: domolinknnov, //Нижегородский филиал
    kirov: domolinkkirov, // Личный кабинет абонентов Домолинк Киров

    ug_ast: domolinkug, //Астраханская область, 
    ug_vlgr: domolinkug, //Волгоградская область, 
    ug_krasnd: domolinkug, //Краснодарский край, 
    ug_adg: domolinkug, //Адыгея, 
    ug_dgs: domolinkug, //Дагестан, 
    ug_kab: domolinkug, //Кабардино-Балкария, 
    ug_kal: domolinkug, //Калмыкия, 
    ug_kar: domolinkug, //Карачаево-Черкессия, 
    ug_sos: domolinkug, //Северная Осетия, 
    ug_ros: domolinkug, //Ростовская область, 
    ug_stav: domolinkug, //Ставропольский край

    n_belg: domolink_new,
    n_bryansk: domolink_new, //Новый личный кабинет РТ
    n_vladimir: domolink_new,
    n_voronezh: domolink_new,
    n_ivanov: domolink_new,
    n_kaluzh: domolink_new,
    n_kostroma: domolink_new,
    n_kursk: domolink_new,
    n_lipetsk: domolink_new,
    n_moscow: domolink_new,
    n_orlov: domolink_new,
    n_ryaz: domolink_new,
    n_smolensk: domolink_new, //Новый личный кабинет РТ
    n_tambov: domolink_new,
    n_tver: domolink_new,
    n_tula: domolink_new,
    n_yar: domolink_new
};

var regions_new = {
    n_belg: 'Белгородский',
    n_bryansk: 'Брянский',
    n_vladimir: 'Владимирский',
    n_voronezh: 'Воронежский',
    n_ivanov: 'Ивановский',
    n_kaluzh: 'Калужский',
    n_kostroma: 'Костромской',
    n_kursk: 'Курский',
    n_lipetsk: 'Липецкий',
    n_moscow: 'Московский',
    n_orlov: 'Орловский',
    n_ryaz: 'Рязанский',
    n_smolensk: 'Смоленский',
    n_tambov: 'Тамбовский',
    n_tver: 'Тверской',
    n_tula: 'Тульский',
    n_yar: 'Ярославский'
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function getParam (html, result, param, regexp, replaces, parser) {
    if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
        return;

    var value = regexp ? regexp.exec (html) : html;
    if (value) {
        if(regexp)
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

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.', /(\d)\-(\d)/g, '$1.$2'];

function parseBalance(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    if(!regions[prefs.region]){
        AnyBalance.trace("Unknown region: " + prefs.region + ", setting to msk");
        throw new AnyBalance.Error("Не верно указан регион: " + prefs.region);
    }
    AnyBalance.trace("Entering region: " + prefs.region);
    (regions[prefs.region])(prefs.region,prefs.login,prefs.password);
	
}

function getData(param) {
    for(var i in arr) {
        if (!arr.hasOwnProperty(i)) continue;
    }
}

function domolinkkirov(region, login, password){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://j-cabinet.kirov.ru:4459/pls/base/';
    var html = AnyBalance.requestPost(baseurl + 'www.GetHomePage', {
        p_logname:login,
        p_pwd:password
    });

    var href = getParam(html, null, null, /<frame[^>]*src="([^"]*)"[^>]*name="MainFrame"/i);
    if(!href){
        var error = getParam(html, null, null, /Сообщение об ошибке\s*<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + href);
    href = getParam(html, null, null, /<frame[^>]*src="([^"]*)"[^>]*name="MenuFrame"/i);
    if(!href)
        throw new AnyBalance.Error('Не удалось найти ссылку на меню. Сайт изменен?');

    var htmlMenu = AnyBalance.requestGet(baseurl + href);
    href = getParam(htmlMenu, null, null, /<a[^>]*href="([^"]*)[^>]*>(?:\s*<[^>]+>)*\s*Информация по договору/i);
    
    if(!href)
        throw new AnyBalance.Error('Не удалось найти ссылку на Информацию по договору. Сайт изменен?');

    var result = {
        success: true
    };
    getParam(htmlMenu, result, '__tariff', /<div[^>]*class="txt"[^>]*>[\s\S]*?<br[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    
    html = AnyBalance.requestGet(baseurl + href);
    href = getParam(html, null, null, /<frame[^>]*src="([^"]*)"[^>]*name="pageFrame"/i);
    if(AnyBalance.isAvailable('lastpaysum', 'lastpaydata', 'lastpaydesc')){
        var _href = getParam(html, null, null, /<frame[^>]*src="([^"]*)"[^>]*name="MenuFrame"/i);
        htmlMenu = AnyBalance.requestGet(baseurl + _href);
    }

    html = AnyBalance.requestGet(baseurl + href);
    //Наконец-то добрались до баланса. Ростелеком нужно убить, они реально криворукие...

    getParam(html, result, 'balance', /Текущее состояние лицевого счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'username', /Организация[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    
    if(AnyBalance.isAvailable('lastpaysum', 'lastpaydata', 'lastpaydesc')){
        href = getParam(htmlMenu, null, null, /<a[^>]*href="([^"]*)[^>]*>(?:\s*<[^>]+>)*\s*Платежи/i);
        if(!href)
            throw new AnyBalance.Error('Не удалось найти ссылку на Платежи. Сайт изменен?');
        html = AnyBalance.requestGet(baseurl + href);

        href = getParam(html, null, null, /<frame[^>]*src="([^"]*)"[^>]*name="pageFrame"/i);
        html = AnyBalance.requestGet(baseurl + href);

        var page_name = getParam(html, null, null, /<input[^>]*name\s*=\s*["']?page_name[^>]*value\s*=\s*["']?([^'"]*)/i);
        var logname = getParam(html, null, null, /<input[^>]*name\s*=\s*["']?logname[^>]*value\s*=\s*["']?([^'"]*)/i);
        var chksum = getParam(html, null, null, /<input[^>]*name\s*=\s*["']?chksum[^>]*value\s*=\s*["']?([^'"]*)/i);
        var dtNow = new Date();
        var dtOld = new Date(dtNow.getTime() - 86400*90*1000);
        html = AnyBalance.requestGet(baseurl + 'www.PageViewer?page_name='+page_name+'&logname='+logname+'&chksum='+chksum+'&n1=p_start_day&n2=p_start_month&n3=p_start_year&n4=p_finish_day&n5=p_finish_month&n6=p_finish_year&n7=p_row_count&n8=p_page_num&v8=1&n9=p_page_go&v9=' 
            + page_name + '&v1='+dtOld.getDate()+'&v2=' + (dtOld.getMonth()+1) + '&v3=' + dtOld.getFullYear() + '&v4='+dtNow.getDate()+'&v2=' + (dtNow.getMonth()+1) + '&v3=' + dtNow.getFullYear() + '&v7=20');

        getParam(html, result, 'lastpaysum', /Платежи по договору[\s\S]*?<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'lastpaydata', /Платежи по договору[\s\S]*?<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'lastpaydesc', /Платежи по договору[\s\S]*?<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    }

    if(AnyBalance.isAvailable('licschet')){
        href = getParam(htmlMenu, null, null, /<a[^>]*href="([^"]*)[^>]*>(?:\s*<[^>]+>)*\s*Справочно-информационное обслуживание/i);
        if(!href)
            throw new AnyBalance.Error('Не удалось найти ссылку на Справочно-информационное обслуживание. Сайт изменен?');
        html = AnyBalance.requestGet(baseurl + href);

        href = getParam(html, null, null, /<frame[^>]*src="([^"]*)"[^>]*name="pageFrame"/i);
        html = AnyBalance.requestGet(baseurl + href);
        
        getParam(html, result, 'licschet', /лицевой счёт\s+№\s*(\d+)/i);
    }

    AnyBalance.setResult(result);
}

function domolink_new(region,login,password) {
    var prefs = AnyBalance.getPreferences();
                                            
    var headers = {
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
        Connection: 'keep-alive'
    };

    var baseurl = 'https://portal.center.rt.ru/ClientWebPortal/appmanager/ClientPortal/PrivateClientDesktop';
    AnyBalance.setDefaultCharset('utf8');    
 
    if(prefs.accnum && !/^\d{4}$/.test(prefs.accnum))
        throw new AnyBalance.Error("Введите в настройки последние 4 цифры лицевого счета или не вводите ничего, чтобы получить информацию по первому счету");

    var accnum = (prefs.accnum || '\\d{4}') + '\\s*$';
    var reAcc = new RegExp(accnum);
    var html;
    
    //Ростелеком входит очень долго, поэтому для отладки лучше отсюда до следующего указания закоментарить и войти вручную.
    if(!prefs.__dbg){
        html = AnyBalance.requestGet(baseurl, headers);
        
        var reg_form_action = getParam(html, null, null, /<form[^>]*name="selectRegionForm"[^>]*action="([^"]*)/i, null, html_entity_decode);
        if(!reg_form_action){
            //AnyBalance.trace(html);
            if(/The source of this error is:/i.test(html))
                throw new AnyBalance.Error("Сайт ростелекома упал. Нужно попробовать ещё раз.", true);
            throw new AnyBalance.Error("Не удаётся найти форму для выбора региона", true);  //Возможно тупой стектрейс, надо ещё попробовать.
        }
        var param_region = getParam(html, null, null, /<input[^>]*id="selectedRegionHidden"[^>]*name="([^"]*)"/i, null, html_entity_decode);
        AnyBalance.trace("region params: " + param_region);
        
        headers.Referer = baseurl;
        
        AnyBalance.trace("Setting region...");
        var params = {};
        params[param_region] = regions_new[region];
        html = AnyBalance.requestPost(reg_form_action, params, headers);
        
        var form_action = getParam(html, null, null, /<form[^>]*name="logScope\.log_form"[^>]*action="([^"]*)/i, null, html_entity_decode);
        if(!form_action){
            //AnyBalance.trace(html);
            throw new AnyBalance.Error("Не удаётся найти форму для входа в личный кабинет");
        }
        
        AnyBalance.trace("Getting login form: " + baseurl);
        var param_username = getParam(html, null, null, /<input[^>]*name="([^"]*)"[^>]*id="logScope.actionForm_username"/i);
        var param_password = getParam(html, null, null, /<input[^>]*name="([^"]*)"[^>]*id="logScope.actionForm_password"/i);
        var param_desktop = getParam(html, null, null, /<input[^>]*id="logScope.actionForm_desktop"[^>]*name="([^"]*)"/i);
        AnyBalance.trace("login params: " + param_username + ", " + param_password + ", " + param_desktop);
        
        // Заходим на главную страницу
        var params = {};
        params[param_username] = prefs.login;
        params[param_password] = prefs.password;
        params[param_desktop] = 'PrivateClient_portal_main_page';
        
        AnyBalance.trace("Entering client portal: " + form_action);
        html = AnyBalance.requestPost(form_action, params, headers);
	
        if(/name="logScope.log_form"/i.test(html)){
            //AnyBalance.trace(html);
            var error = getParam(html, null, null, /<div[^>]+id="loginArea[\s\S]*?<[^>]*txtRed[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
            if(error){
                //AnyBalance.trace(html);
                throw new AnyBalance.Error(error);
            }
        
            throw new AnyBalance.Error("Не удалось войти в личный кабинет. Изменился личный кабинет или проблемы на сайте.");
        }
        
    //Вот досюда надо закомментарить, чтобы можно было сразу парсить в уже залогиненом кабинете. */
    }

    AnyBalance.trace("Requesting accounts info...");
    html = AnyBalance.requestGet(baseurl + "?_nfpb=true&_pageLabel=PrivateClient_portal_Services_page");
    
    //AnyBalance.trace(html);
    var $html = $(html);
    
    var $acc = $html.find('.gridTableContainer table tr').filter(function(i){
        var num = $(this).find('a[href*="_number="]').first().text();
        return reAcc.test(num);
    }).first();
    
    if(!$acc.size())
        throw new AnyBalance.Error('Невозможно найти информацию ' + (prefs.accnum ? 'по счету с последними цифрами ' + prefs.accnum : 'ни по одному лицевому счету') + '!');
    
    var result = {
        success: true
    };
    
    getParam($acc.find('>td:first-child>img').attr('title'), result, '__tariff', null, replaceTagsAndSpaces);
    getParam($acc.find('>td:nth-child(2)').text(), result, 'license', null, replaceTagsAndSpaces);
    getParam($acc.find('>td:nth-child(3)').text(), result, 'username', null, replaceTagsAndSpaces);
    getParam($acc.find('>td:nth-child(4)').text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    
    var $subaccs = $acc.next();
    getParam($subaccs.find('table.uslugi tr:first-child td:nth-child(3) label').first().text(), result, '__tariff', null, replaceTagsAndSpaces);
    
    AnyBalance.setResult(result);
}
    
function domolinktula(region,login,password) {
    var baseurl = 'https://cabinet.tulatelecom.ru';
    var regionurl = baseurl + '/pls/sip/';
    AnyBalance.setDefaultCharset('utf8');    
	
    // Заходим на главную страницу
    var html = AnyBalance.requestPost(regionurl + "www.GetHomePage", {
        p_logname: login,
        p_pwd: password
    });
    var regexp=/REFRESH CONTENT[\W]*[\d]+;\s*URL=(\/[\w\/\.]+\?(p_logname=[\w]+&p_chksum=[\d]+))/,res;
	
    if (res=regexp.exec(html)) {
        html = AnyBalance.requestGet(baseurl + res[1]);
    } else throw new AnyBalance.Error("Не верно указан логин или пароль.");
	
    var result = {
        success: true
    };
	
    var authorization=res[2].split('p_').join('');
    var curmonth = new Date();
    curmonth.setDate(1); // Начало текущего месяца
	
    var urlinfo=regionurl+"www.PageViewer?page_name=S*ADM_NET_INFO&"+authorization;
    var htmlinfo = AnyBalance.requestGet(urlinfo);
	
    var urlrepcon=regionurl+"www.PageViewer?page_name=S*ADM_NET_REP_CON_BY_DAY&"+authorization+"&"+getPeriodMonth(curmonth);
    var htmlrepcon = AnyBalance.requestGet(urlrepcon);
	
    var result = {
        success: true
    };

    AnyBalance.trace("Fetching username,tarif,license,balance...");
	
    // Тариф
    getParam(htmlinfo, result, '__tariff', /Тариф[&\w;]*<\/TD>\s*<TD[\s\w=%]*>\s?(.*)/, null, html_entity_decode);

    // ФИО
    getParam (htmlinfo, result, 'username', /ФИО[&\w;]*<\/TD>\s*<TD[\s\w=%]*>\s?<INPUT[\s\w="]*(.*)/i);
	   
    // Лицевой счет
    getParam (htmlinfo, result, 'license', /Номер лицевого счета[&\w;]*<\/TD>\s*<TD[\s\w=%]*>\s?(.*)/);
	
    // Баланс
    getParam (htmlinfo, result, 'balance', /Текущее состояние лицевого счета[&\w;]*<\/TD>\s*<TD[\s\w=%]*>\s*([\d\.]*)/, [/ |\xA0/, "", ",", "."], parseFloat);
	
    // Абоненская плата
    getParam (htmlrepcon, result, 'monthlypay', /\<TR[\s\w=\>\<\"\/]*Абонентская плата[\<\/\w\>\s=\"]*\>[\d\.]*[\<\/\w\>\s=\"шт]*\>\s*([\d\.]*)\<\/TD\>\s*\<\/TR\>/, [/ |\xA0/, "", ",", "."], parseFloat);
	
    var urlreppay=regionurl+"www.PageViewer?page_name=S*ADM_NET_REP_PAY&"+authorization;
	
    if (AnyBalance.isAvailable ('lastpaysum') ||
        AnyBalance.isAvailable ('lastpaydata')
        //|| AnyBalance.isAvailable ('lastpaydesc')
        ) {

        AnyBalance.trace("Fetching payment...");

        regexp = />([\d{2}\.]+)<\/[\D<>]*([\d{2}\.]+)<\/TD>/g;
		
        var htmlpay,urlpay;
        for(var i=0; i<3; i++) { // смотрим макс. на 3 месяца назад
            urlpay = urlreppay+"&"+getPeriodMonth(curmonth);
            AnyBalance.trace("Checking "+(i+1)+"th month...");
            htmlpay = AnyBalance.requestGet(urlpay);
            if(regexp.exec(htmlpay)){
                AnyBalance.trace("... bingo! We're find the last payment.");
                htmlpay.replace(regexp, function(str, p1, p2){
                    //Выбираем запись с максимальной датой
                    if(result.lastpaydata == undefined || result.lastpaydata.split('.').reverse().join('') < p1.split('.').reverse().join('')){
                        result.lastpaydata = p1;
                        result.lastpaysum = parseFloat(p2);
                    //result.lastpaydesc = '';
                    }
                    return str;
                });
                break;
            }
            curmonth.setMonth(curmonth.getMonth()-1);
        }
    }
    
    AnyBalance.setResult(result);
}

String.prototype.right = function(num){
    return this.substr(this.length-num,num);
}

function getPeriodParams(begin,end){
    return [
    'n1=p_start_day',	'v1='+('0'+begin.getDate()).right(2),
    'n2=p_start_month',	'v2='+('0'+(begin.getMonth()+1)).right(2),
    'n3=p_start_year',	'v3='+begin.getFullYear(),
    'n4=p_finish_day',	'v4='+('0'+end.getDate()).right(2),
    'n5=p_finish_month','v5='+('0'+(end.getMonth()+1)).right(2),
    'n6=p_finish_year',	'v6='+end.getFullYear(),
    'n7=p_page_num','v7=1',
    'n8=p_row_count','v8=100',
    'n9=p_username',
    'n10=p_logname_detail',	'v10=N',
    ].join('&');
}

function getPeriodMonth(date){
    var begin = new Date(date.getFullYear(),date.getMonth(),1); // начало месяца
    var end = new Date(date.getFullYear(),date.getMonth()+1,0); // конец месяца
    return getPeriodParams(begin,end);
}

function domolinkcenter(region,login,password) {
    var baseurl = 'https://room.centertelecom.ru';
    var regionurl = baseurl + '/' + region + '/';
    AnyBalance.setDefaultCharset('utf-8');    
	
    // Заходим на главную страницу
    var html = AnyBalance.requestPost(regionurl + "www.GetHomePage", {
        p_logname: login,
        p_pwd: password
    });
    
    var regexp=/BGCOLOR="RED">[\D]*HEIGHT=100[\D]*>\s*([\S ]*)/,res;
	
    if (res=regexp.exec(html)) 
        throw new AnyBalance.Error(res[1]);
	
    
    var result = {
        success: true
    };

    getParam(html, result, '__tariff', /Тариф<\/TD>\s*<TD[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    // ФИО
    getParam(html, result, 'username', /ФИО<\/TD>\s*<TD[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	   
    // Лицевой счет
    getParam (html, result, 'license', /Номер лицевого счета<\/TD>\s*<TD[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	
    // Баланс
    getParam (html, result, 'balance', /Текущее состояние лицевого счета<\/TD>\s*<TD[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
    if (AnyBalance.isAvailable ('lastpaysum') ||
        AnyBalance.isAvailable ('lastpaydata') ||
        AnyBalance.isAvailable ('lastpaydesc')) {

        AnyBalance.trace("Fetching payment...");

        regexp=/<A HREF="([\w=\.\?&\s]*)">\s?Платежи/;
        if (res=regexp.exec(html)) {
			
            var htmlpay = AnyBalance.requestGet(regionurl + //res[1].replace(/\n/g,""));
                res[1].split(/\n/).join('').replace(/&v(\d)=\d*/g,function(str,p1){ // fix cайта, ссылка на старый механизм, а работает уже только по новому (01.01.2012-31.12.2012)
                    switch (p1) {
                        case '2':
                            return '&v2=01';
                            break;
                        case '4':
                            return '&v4=31';
                            break;
                        case '5':
                            return '&v5=12';
                            break;
                        default:
                            return str;
                    }
                }));
			
            regexp = />([\d{2}\.]+)<\/[\D<>]*([\d{2}\.]+)<\/[\D<>]*([\d\.]+)<\/[\w><\s="]*>([А-Яа-я ]+)<\/TD>/g;
			
            htmlpay.replace(regexp, function(str, p1, p2, p3, p4){
                //Выбираем запись с максимальной датой
                if(result.lastpaydata == undefined || result.lastpaydata.split('.').reverse().join('') < p1.split('.').reverse().join('')){
                    result.lastpaydata = p1;
                    result.lastpaysum = parseFloat(p3);
                    result.lastpaydesc = p4;
                }
                return str;
            });
        }

    }
	
    // Траффик
    if (AnyBalance.isAvailable ('traffic') ||
        AnyBalance.isAvailable ('monthlypay')) {

        AnyBalance.trace("Fetching status...");

        regexp=/<a href="([\w=\.\?&\s]*)">\s?Начисления/;
        if (res=regexp.exec(html)) {
            var htmlcalc = AnyBalance.requestGet(regionurl + res[1].replace(/\n/g,""));
            AnyBalance.trace("Fetching calculation table");
			
            // Трафик в текущем месяце
            getParam (htmlcalc, result, 'traffic', /интернет трафик[\D]*([\d.]*) Мб</, [/ |\xA0/, "", ",", "."], parseFloat);
			
            // Абоненская плата
            getParam (htmlcalc, result, 'monthlypay', /Абонентская плата[\D]*1 шт[\D]*([\d.]*)</, [/ |\xA0/, "", ",", "."], parseFloat);
        }

    }

    AnyBalance.setResult(result);
}

function domolinknnov(region,login,password) {
    var baseurl = 'http://abonent.nnov.volga.rt.ru/pls/users/';
    AnyBalance.setDefaultCharset('utf8');    
	
    // Заходим на главную страницу
    var html = AnyBalance.requestPost(baseurl + "www.GetHomePage", {
        p_lang:'RUS',
        p_logname: login,
        p_pwd: password
    });
    
    var href = getParam(html, null, null, /<FRAME[^>]+SRC\s*=\s*"([^>]*)"[^>]+NAME\s*=\s*"MAIN"/i, null, html_entity_decode);
    if(!href){
        var error = getParam(html, null, null, /Сообщение об ошибке\s*<\/td>[\s\S]*?<TD[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удаётся найти ссылку на содержимое личного кабинета. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + href);
    
    var result = {
        success: true
    };

    getParam(html, result, '__tariff', /Текущий тарифный план[\s\S]*?<TD[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    // ФИО
    getParam(html, result, 'username', /Номер договора(?:[\s\S]*?<TD[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	   
    // Лицевой счет
    getParam (html, result, 'license', /Номер договора[\s\S]*?<TD[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	
    // Баланс
    getParam (html, result, 'balance', /Текущее состояние лицевого счета[\s\S]*?<TD[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
    // Платежи в текущем месяце
    getParam (html, result, 'lastpaysum', /Платежи в текущем месяце[\s\S]*?<TD[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    if(AnyBalance.isAvailable('lastpaydesc'))
        result.lastpaydesc = 'Платежи в текущем месяце';
	
    getParam (html, result, 'monthlypay', /Расходы в текущем месяце[\s\S]*?<TD[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function gwtEscape(str){
    return str.replace(/\\/g, '\\\\').replace(/\|/g, '\!');
}

function gwtGetStrongName(js){
    var varName = getParam(js, null, null, /(\w+)='safari'/);
    if(!varName)
        throw new AnyBalance.Error('Не удаётся найти $strongName: ссылку на браузер.');
    var re = new RegExp('\\(\\['+varName+'\\],(\\w+)\\)');
    var varNameStrong = getParam(js, null, null, re);
    if(!varNameStrong)
        throw new AnyBalance.Error('Не удаётся найти $strongName: имя переменной.');
    re = new RegExp('\\b'+varNameStrong+'=\'([^\']*)');
    var val = getParam(js, null, null, re);
    if(!val)
        throw new AnyBalance.Error('Не удаётся найти $strongName: значение переменной.');
    return val;
}

function gwtGetJSON(str){
    var json = getParam(str, null, null, /\/\/OK(.*)/);
    if(!json)
        throw new AnyBalance.Error('Ошибка получения ответа: ' + str);
    return JSON.parse(json);
}

function domolinkug(region,login,password) {
    var baseurl = 'https://my.south.rt.ru/';
    AnyBalance.setDefaultCharset('utf8');    
	
    // Заходим на главную страницу
    var html = AnyBalance.requestGet(baseurl + "login");
    if(/Tomcat Server is Dead/.test(html))
        throw new AnyBalance.Error("Сервер временно недоступен. Попробуйте позднее");

    //Скачиваем скрипт для поиска $strongName
    html = AnyBalance.requestGet(baseurl + 'login/login.nocache.js');

    //Авторизируемся
    html = AnyBalance.requestPost(baseurl + "login/UniappService", 
        "7|0|7|https://my.south.rt.ru/login/|AD22A0AE25C10F870D4CEAEC535FB2E0|ru.stcompany.uniapp.client.action.rpc.UniappService|login|java.lang.String/2004016611|" + gwtEscape(login) + "|" + gwtEscape(password) + "|1|2|3|4|2|5|5|6|7|",
        { 
          'Content-Type': 'text/x-gwt-rpc; charset=UTF-8', 
          'X-GWT-Module-Base':baseurl + 'login/',
          'X-GWT-Permutation':gwtGetStrongName(html)
        }
    );

    //Тут получаем что-то вроде //OK[0,5,0,0,0,0,4,3,2,1,1,["ru.stcompany.uniapp.client.global.AppUser/557065269","Успешная аутентификация","ИП ВОРОНЦОВ А.А.","T","stat-636127"],0,7]
    var auth = gwtGetJSON(html);
    if(auth[11][1] != 'Успешная аутентификация')
        throw new AnyBalance.Error(auth[11][1]);

    var result = { success: true };

    if(AnyBalance.isAvailable('username'))
        result.username = auth[11][2];

    //Заходим в новую главную страницу
    html = AnyBalance.requestPost(baseurl + "login", {
        'login-field': login,
        'pwd-field': password
    });

    //Скачиваем новый скрипт для поиска $strongName
    html = AnyBalance.requestGet(baseurl + 'uniapp/uniapp.nocache.js');
    var permut = gwtGetStrongName(html);

    //Получаем баланс
    html = AnyBalance.requestPost(baseurl + 'uniapp/UniappService',
        "7|0|8|https://my.south.rt.ru/uniapp/|AD22A0AE25C10F870D4CEAEC535FB2E0|ru.stcompany.uniapp.client.action.rpc.UniappService|getForm|java.lang.String/2004016611|java.util.Map|186688160|java.util.LinkedHashMap/3008245022|1|2|3|4|2|5|6|7|8|0|0|",
        { 
          'Content-Type': 'text/x-gwt-rpc; charset=UTF-8', 
          'X-GWT-Module-Base':baseurl + 'uniapp',
          'X-GWT-Permutation':permut
        }
    );

    getParam(html, result, 'balance', /(-?\d+[.,]?\d*)\s+руб\./i, null, parseBalance);

    //Получаем тарифный план интернет
    html = AnyBalance.requestPost(baseurl + 'uniapp/UniappService',
        "7|0|8|https://my.south.rt.ru/uniapp/|AD22A0AE25C10F870D4CEAEC535FB2E0|ru.stcompany.uniapp.client.action.rpc.UniappService|getForm|java.lang.String/2004016611|java.util.Map|368618895|java.util.LinkedHashMap/3008245022|1|2|3|4|2|5|6|7|8|0|0|",
        { 
          'Content-Type': 'text/x-gwt-rpc; charset=UTF-8', 
          'X-GWT-Module-Base':baseurl + 'uniapp',
          'X-GWT-Permutation':permut
        }
    );

    getParam(html, result, '__tariff', /Текущий тарифный план:.*?DFTITLE=\\"([^"]*)\\"/i, null, html_entity_decode);
    getParam(html, result, 'license', /Лицевой счет:.*?DFTITLE=\\"([^"]*)\\"/i, null, html_entity_decode);

    AnyBalance.setResult(result); 
}

