/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lg.e-svitlo.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	var html = AnyBalance.requestPost(baseurl+'registr_all_user/login_all_user',{email:prefs.login, password:prefs.password});
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	var err=getParam(html,null,null,/navbar navbar-inverse">([\s\S]*?)<div class="navbar-inner"/,replaceTagsAndSpaces,html_entity_decode)
	if (err&&err!='Ласкаво просимо'){
		AnyBalance.trace(html);
		AnyBalance.trace(err);
		throw new AnyBalance.Error(err,false,/парол|заблок|e-?mail|телеф|пользоват|користува/.test(err));
	}
        var html = AnyBalance.requestGet(baseurl+'account_household');
	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var households=[];
	var household={};
	var table = getElement(html, /<table class="styled-up-custom-table">/i);
	var rows = getElements(table, /<tr/ig);
	for(var i=1; i<rows.length; i++){
		var row = rows[i];
		household.id = getParam(row, /insert_calc_value\?a=(\d*)/i, replaceTagsAndSpaces);
		household.ls = getParam(row, /<td>([^<]*)/i, replaceTagsAndSpaces);
		household.fio = getParam(row, /(?:[\s\S]*?<td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
		household.adr = getParam(row, /(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces);
                if (household.id) 
                	households.push({id:household.id,ls:household.ls,fio:household.fio,adr:household.adr});
                AnyBalance.trace('Найден лицевой счет:\n'+household.ls+' ('+household.fio+', '+household.adr+')');
	}
	if (!households[0].id)
		throw new AnyBalance.Error('Не найдено ни одного лицевого счета.');
	if (prefs.ls) 
		households=households.filter(h => h.ls.includes(prefs.ls)||h.fio.includes(prefs.ls)||h.adr.includes(prefs.ls));
        if (households.length==0)
        	throw new AnyBalance.Error('Не найден лицевой счет содержащий в лицевом счете, фамилии или адресе "'+prefs.ls+'"');
        var result=households[0];
        result.success=true;

        AnyBalance.trace('Выбран лицевой счет:\n'+result.ls+' ('+result.fio+', '+result.adr+')');
        var html = AnyBalance.requestGet(baseurl+'account_household/view_main_details?a='+result.id+'&highlight=account_household&osr=1');
        getParam(html, result, 'eic', /EIC код[\s\S]*?<div[^>]*?>([^<]*)/);
        getParam(html, result, 'lastvaluedate', /Останні розрахункові покази лічильника[\s\S]*?<div[^>]*?>([^<]*)/,null, parseDate);

        var tmp=getElementsByClassName(html,'borg-text',replaceTagsAndSpaces, null);
	getParam(tmp[1], result, 'balance', null , null, parseBalance);        
        if (tmp[0]=='Сума до сплати') result.balance=-result.balance;
        getParam(tmp[2], result, 'pay', null , null, parseBalance);        
        getParam(tmp[3], result, 'lastpaydate', null , null, parseDate);        

        tmp=getParam(html,/Останні розрахункові покази лічильника[\s\S]*?<\/div>([\s\S]*?)<div class="first-column">/)
        tmp=getElements(tmp,/<h4>/g,replaceTagsAndSpaces,parseBalance)
        getParam(tmp[0], result, 'value1');        
        getParam(tmp[1], result, 'value2');        
        getParam(tmp[2], result, 'value3');        

        tmp=getParam(html,/Споживання за останній розрахунковий місяць[\s\S]*?<\/div>([\s\S]*?)<\/div>\s*<\/div>/)
        tmp=getElements(tmp,/<h4>/g,replaceTagsAndSpaces,parseBalance)
        getParam(tmp[0], result, 'use1');        
        getParam(tmp[1], result, 'use2');        
        getParam(tmp[2], result, 'use3');        

        result.__tariff=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Окябрь','Ноябрь','Декабрь'][getFormattedDate({offsetMonth:1,format:'M'},new Date(result.lastvaluedate))-1]+getFormattedDate({offsetMonth:1,format:' YYYY г.'},new Date(result.lastvaluedate));

        AnyBalance.setResult(result);
}
