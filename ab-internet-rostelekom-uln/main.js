/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Интернет Ростелеком Ульяновск
Сайт оператора: http://ul.vt.ru/
Личный кабинет: http://my.ul.vt.ru/pls/internet/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://my.ul.volga.rt.ru/pls/internet/';
    // Заходим на главную страницу
    var html = AnyBalance.requestPost(baseurl + "www.GetHomePage", {
    	p_lang: 'RUS',
    	p_logname: prefs.login,
    	p_pwd: prefs.password
    });

    var matches = html.match(/Сообщение об ошибке<\/TD>\s*<\/TR>\s*<TR[^>]+>\s*<TD[^>]+>(.*)\n/i);
    if(matches){
    	//alert(matches[1].replace(/<[^>]+>/g, ''));
    	throw new AnyBalance.Error(matches[1].replace(/^\s*|\s*$/g, ''));
    }

    var matches = html.match(/<meta[^>]+URL=([^"]+)/i);
    if(!matches){
    	throw new AnyBalance.Error('Ошибка входа');
    }

    var html = AnyBalance.requestGet(baseurl+matches[1]);
  
    var result = {success: true};
    
    var $html = $(html);

    var val = $html.find('td:contains("Тарифный план")').next().text();
    if(val)
    	 result.__tariff = val.replace(/^\s*|\s*$/g, '');
    
    if(AnyBalance.isAvailable('balance')){
        var val = $html.find('td:contains("Текущее состояние лицевого счета")').next().text();
        if(val && (matches = val.match(/[\-\d\.]+/)))
            result.balance = parseFloat(matches[0]);
    }
    if(AnyBalance.isAvailable('mounth_pays')){
        var val = $html.find('td:contains("Платежи в текущем месяце")').next().text();
        if(val && (matches = val.match(/[\-\d\.]+/)))
            result.mounth_pays = parseFloat(matches[0]);
    }
    if(AnyBalance.isAvailable('begin_balance')){
        var val = $html.find('td:contains("Состояние лицевого счета на начало текущего месяца")').next().text();
        if(val && (matches = val.match(/[\-\d\.]+/)))
            result.begin_balance = parseFloat(matches[0]);
    }    
    if(AnyBalance.isAvailable('belive_pays')){
        var val = $html.find('td:contains("Обещанные платежи")').next().text();
        if(val && (matches = val.match(/[\-\d\.]+/)))
            result.belive_pays = parseFloat(matches[0]);
    }      
    if(AnyBalance.isAvailable('mounth_charge')){
        var val = $html.find('td:contains("Начислено за услуги в текущем месяце")').next().text();
        if(val && (matches = val.match(/[\-\d\.]+/)))
            result.mounth_charge = parseFloat(matches[0]);
    }      
    if(AnyBalance.isAvailable('adjust')){
        var val = $html.find('td:contains("Перерасчет начислений")').next().text();
        if(val && (matches = val.match(/[\-\d\.]+/)))
            result.adjust = parseFloat(matches[0]);
    }      
    if(AnyBalance.isAvailable('credit')){
        var val = $html.find('td:contains("Кредит")').next().text();
        if(val && (matches = val.match(/[\-\d\.]+/)))
            result.credit = parseFloat(matches[0]);
    }      
    AnyBalance.setResult(result);
}