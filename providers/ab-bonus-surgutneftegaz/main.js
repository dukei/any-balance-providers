﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://lk.sngbonus.ru/';
   	checkEmpty(prefs.login, 'Введите логин!');
   	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');
    AnyBalance.setOptions({forceCharset:'utf-8'});

	var result = {success: true};
	var params={username:prefs.login,password:prefs.password};
	var html = AnyBalance.requestPost(baseurl + 'signin',params);
	if (/Введены неверные данные/i.test(html)&&/grecaptcha/i.test(html)){
		var capcha=getParam(html,/sitekey'[^']*'([^']*)/);
		var capcha=solveRecaptcha("Пожалуйста, докажите, что Вы не робот", AnyBalance.getLastUrl(), capcha);
                params['g-recaptcha-response']=capcha;
                var html = AnyBalance.requestPost(baseurl + 'signin',params);
	}
        if (!/logout/i.test(html)) {
            var error = getParam(html, null, null, /form_error[^>]*>([^<]*?)</i);
            if (error) throw new AnyBalance.Error(error, false, /пароль/i.test(error));
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
        getParam(html, result, 'balance', /Ваш баланс:([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'this_month', /В этом месяце получено([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'next_status_left', /Получите еще([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'status', /Статус:[\s\S]*?<b>([\s\S]*?)<\//i, replaceTagsAndSpaces);
        getParam(html, result, 'cardnum' , /card_number noselect[\s\S]*?<span>([\s\S]*?)<\//i, replaceTagsAndSpaces);
        getParam(html, result, '__tariff', /card_number noselect[\s\S]*?<span>([\s\S]*?)<\//i, replaceTagsAndSpaces);

        var html = AnyBalance.requestPost(baseurl + 'purchases');
        var row=getParam(html,/<tr class="bill-row" bid="0">([\s\S]*?)<\/tr>/)
        var str=getParam(row,/bill-row-otype[^>]*>([\s\S]*?)</)+' ';
        str+=getParam(row,/bill-row-postime[^>]*>([\s\S]*?)</)+'<br>';
        var s=row.match(/bill-row-p(?:name|amount|price)[^>]*>([\s\S]*?)</g);
        for (var i=0;i<s.length;i+=3){
        	var name=getParam(s[i],/>(.*)</);
        	var amount=getParam(s[i+1],/>(.*)</,null,parseBalance);
        	var price=getParam(s[i+2],/>(.*)</,null,parseBalance);
        	str+=name+' '+amount+' по '+price.toFixed(2)+'<br>';
        }
        str+='Оплачено всего:<strong>'+getParam(row,/bill-row-cost[^>]*>([\s\S]*?)</)+'<br></strong>';
        var b=getParam(row,/bill-row-boff[^>]*>([\s\S]*?)</);
        if (b!='0.00') str+='Оплачено бонусами:<font  color=#8B0000><strong>'+b+'</strong></font><br>';
        str+='Начислено бонусов:<font  color=#006400><strong>'+getParam(row,/bill-row-badd[^>]*>([\s\S]*?)</)+'</strong></font><br>';
        result.last_operation=str;
        AnyBalance.setResult(result);
}