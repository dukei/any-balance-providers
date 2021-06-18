/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

ЕРЦ Мегабанк
Сайт: https://erc.megabank.net/
*/

//------------------------------------------------------------------------------

function main(){

  AnyBalance.setDefaultCharset('utf-8');
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://cks.com.ua/';
  var headers = {
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
    'Content-Type':'application/x-www-form-urlencoded',
    Connection: 'keep-alive'
  };
  var href=AnyBalance.getData(prefs.login+'href');
  if (href)  
  	AnyBalance.restoreCookies();
  else{
  	AnyBalance.trace('Connecting to ' + baseurl);
  	var html = AnyBalance.requestPost(baseurl+'post/cabinet/login/', {email:prefs.login,password:prefs.password},headers);
  	var err=getElementsByClassName(html,'alert alert-danger');
  	if (err&&err.length>0){
  		AnyBalance.trace(html);
  		throw new AnyBalance.Error(getParam(err[0],null,null,null,replaceTagsAndSpaces), null, true);
  	}
  	html=AnyBalance.requestGet(baseurl+'cabinet/objects/',headers);
  	AnyBalance.trace('Поиск адресов');
  	var objs=getElementsByClassName(html,'col-md-6');
  	var adrs=[];
  	for (var i=0;i<objs.length;i++){
  		var adr=getElementsByClassName(objs[i],'address');
	  	if (!adr||!adr.length) continue;
	  	adr=adr[0];
	  	var href=getParam(adr,null,null,/href="([^"]*)/);
	  	adr=getParam(adr,null,null,/title="([^"]*)/)+getParam(adr,null,null,/>\s*<br>([^<]*)/);
	        adr=getParam(adr,null,null,null,replaceTagsAndSpaces);
	        if (href&&adr) adrs.push({href:href,adr:adr});
  	}
  	var ask='';
	var href='';
	if (adrs.length==0){
  		throw new AnyBalance.Error('Не знайдено жодної адреси', null, true);
	}else if(adrs.length==1){
  		href=adrs[0].href;
	}else{
  		for (var i=0;i<adrs.length;i++)
  			ask+=(i+1)+'. '+adrs[i].adr+'\n';
  		ask='Оберіть адресу, по якій потрібно отримувати інформацію про заборгованість\n'+ask+'\nВведіть число від 1 до '+adrs.length;
  		href=adrs[parseInt(AnyBalance.retrieveCode(ask, null, {time: 60000,inputType: 'number',minLength: 1,maxLength: 2,}))-1].href;
	}
	AnyBalance.setData(prefs.login+'href',href);
  }
  var html=AnyBalance.requestGet(href);
  if (/Спробуйте повторити запит пізніше/i.test(html)){
      throw new AnyBalance.Error('Спробуйте повторити запит пізніше', true, null);
  }
  var table= getElementById(html,'data-table');
  var result = {success:true,balance:0};
  var addr=getParam(table,null,null,/span>([\s\S]*?)<\/span>/);
  if (!addr){
  	AnyBalance.trace('Что-то пошло не так.');
  	AnyBalance.trace(html);
  	AnyBalance.setData(prefs.login+'href','');
  	clearAllCookies();
  	AnyBalance.saveCookies();
	AnyBalance.saveData();
  	throw new AnyBalance.Error('Несподівана відповідь від серверу. Можливо сайт було змінено.', null, true);
  }
  getParam(addr,result,'address');
  getParam(html,result,'__tariff',/Рахунок за ([^<]*?)</);
  var rows=getElementsByClassName(table,'item-row');
    for (var i=0;i<rows.length;i++){
    	var service=getElementsByClassName(rows[i],'border-bottom td-header',replaceTagsAndSpaces)[0];
    	var sum=getParam(rows[i],null,null,/bill-summ-input txt num-short form-txt-input[\s\S]*?value="([^"]*)/);
    	setCounter(result,service,sum);
    }
  AnyBalance.saveCookies();
  AnyBalance.saveData();
  AnyBalance.setResult(result);
}

function setCounter(result,service,sum){
	if (!service||!sum) return;
	AnyBalance.trace('Знайдено:'+service+'\nБорг:'+sum);

	if(/загальнобудинкового лічильника/i.test(service)||/вузла комерційного обліку/i.test(service)){
		getParam(sum, result, 'heating_counter', null, null, parseBalance);
	}else if(/ЦЕНТРАЛІЗОВАНЕ ОПАЛЕННЯ/i.test(service)) { 
    		getParam(sum, result, 'heating', null, null, parseBalance);
	}else if(/ПОСТАЧАННЯ ГАРЯЧОЇ ВОДИ/i.test(service)) { 
    		getParam(sum, result, 'hot_water', null, null, parseBalance);
	}else if(/ЕЛЕКТРОЕНЕРГIЯ/i.test(service)) { 
    		getParam(sum, result, 'electricity', null, null, parseBalance);
	}else if(/УТРИМАННЯ БУДИНКІВ/i.test(service)) { 
    		getParam(sum, result, 'rent', null, null, parseBalance);
	}else if(/ПОБУТОВИХ ВІДХОДІВ/i.test(service)) { 
    		getParam(sum, result, 'garbage', null, null, parseBalance);
	}else if(/розподіл газу/i.test(service)) { 
    		getParam(sum, result, 'gasrasp', null, null, parseBalance);
	}else if(/спожитий газ/i.test(service)) { 
    		getParam(sum, result, 'gas', null, null, parseBalance);
	}else if(/ПОСТАЧАННЯ ГАРЯЧОЇ ВОДИ/i.test(service)) { 
    		getParam(sum, result, 'hot_water', null, null, parseBalance);
	}else if(/ВОДОВІДВЕДЕННЯ ГАРЯЧОЇ ВОДИ/i.test(service)) { 
    		getParam(sum, result, 'hot_water_out', null, null, parseBalance);
	}else if(/ПОСТАЧАННЯ ХОЛОДНОЇ ВОДИ/i.test(service)) { 
    		getParam(sum, result, 'cold_water', null, null, parseBalance);
	}else if(/ВОДОВІДВЕДЕННЯ/i.test(service)) { 
    		getParam(sum, result, 'cold_water_out', null, null, parseBalance);
	}else if(/ДОМОФОН/i.test(service)) { 
    		getParam(sum, result, 'domofon', null, null, parseBalance);

	}else{
		AnyBalance.trace('^-- Невідома послуга. Пропущено');
	}
        sumParam(sum, result, 'balance', null, null, parseBalance, aggregate_sum);
}
