/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Накопительная программа от магазина М.Видео "М.Видео-БОНУС" совместно с Альфа-Банком "М.Видео-БОНУС - Альфа-Банк"

Сайт магазина: http://www.mvideo.ru/
Сайт банка: http://www.alfabank.ru/
Сайт бонусной программы: http://www.mvideo-bonus.ru/
Личный кабинет: http://www.mvideo-bonus.ru/personal/

*/

function addzero(i) {
return (i < 10)? "0" + i: i;
}

function format_date(d,format){
	var m;
	if(d[4]+d[5]=="01"){m="янв";}
	if(d[4]+d[5]=="02"){m="фев";}
	if(d[4]+d[5]=="03"){m="мар";}
	if(d[4]+d[5]=="04"){m="апр";}
	if(d[4]+d[5]=="05"){m="май";}
	if(d[4]+d[5]=="06"){m="июн";}
	if(d[4]+d[5]=="07"){m="июл";}
	if(d[4]+d[5]=="08"){m="авг";}
	if(d[4]+d[5]=="09"){m="сен";}
	if(d[4]+d[5]=="10"){m="окт";}
	if(d[4]+d[5]=="11"){m="ноя";}
	if(d[4]+d[5]=="12"){m="дек";}
	if(format == 1){d=d[0]+d[1]+d[2]+d[3]+' '+m+' '+d[6]+d[7];}              //          YYYY MMM DD
	if(format == 2){d=d[6]+d[7]+' '+m+' '+d[0]+d[1]+d[2]+d[3];}              //          DD MMM YYYY
	if(format == 3){d=d[0]+d[1]+d[2]+d[3]+'-'+d[4]+d[5]+'-'+d[6]+d[7];}//          YYYY-MM-DD
	if(format == 4){d=d[6]+d[7]+'-'+d[4]+d[5]+'-'+d[0]+d[1]+d[2]+d[3];}//          DD-MM-YYYY
	return d;
}

function main(){


	AnyBalance.trace('Connecting...');
	var prefs = AnyBalance.getPreferences();
		
        AnyBalance.setDefaultCharset('utf-8');
	var html = AnyBalance.requestGet('http://www.mvideo-bonus.ru/');//Получаем куки.
        var matches = /(\d{1,2})[^\d](\d{1,2})[^\d](\d\d\d\d)/.exec('' + prefs.birthday);
    	if(!matches)
        	throw new AnyBalance.Error('День рождения должен быть в формате DD-MM-YYYY, например, 28-04-1980');
        var birthdate = new Date(matches[2]+'/'+matches[1]+'/'+matches[3]);
	if (prefs.type == 0){
			var url='http://www.mvideo-bonus.ru/personal/login';
		        matches = /(\d\d\d\d)(\d\d\d\d)/.exec(prefs.card);
		}else{
			var url='http://www.mvideo-bonus.ru/personal/cobrand';
			matches = /(\d)(\d\d\d\d)(\d\d\d)/.exec(prefs.card);
	}
	var post={
		zip:prefs.zip,
		num1:matches[1],
		num2:matches[2],
		num3:matches[3],
		"birthdate[Date_Day]":addzero(birthdate.getDate()),
		"birthdate[Date_Month]":addzero(birthdate.getMonth()+1),
		"birthdate[Date_Year]":birthdate.getFullYear(),

	};
	var header = {
		"Accept"	:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Referer"	:"http://www.mvideo-bonus.ru/"
	};

	AnyBalance.trace(prefs.type);
	AnyBalance.trace(url);
	AnyBalance.trace(post.num1+' '+post.num2+' '+post.num3);
	html = AnyBalance.requestPost(url, post, header);
	if (prefs.type == 0){
			var res =/<form action=\"\/personal\/login.*\n((.*\n))*.*заполнения.*\n.*<\/form>/m.exec(html);
		}else{
			var res =/<form action=\"\/personal\/cobrand.*\n((.*\n))*.*заполнения.*\n.*<\/form>/m.exec(html);
	}

        if (res){
		AnyBalance.trace(res[0]);
		var err =/<div class=\"errtx\">(.*?)<\/div>/.exec(res[0])
		AnyBalance.trace(err[1]);
	}

	if (/Здравствуйте/.exec(html)){
		AnyBalance.trace('Authentication is successful');	
	}else{
		AnyBalance.trace('Authorization error.');	
		throw new AnyBalance.Error ('Ошибка авторизации. '+err[1]);
	}

	AnyBalance.trace('Start parsing...');
	var result = {success: true};

//Бонусная шкала
//        if(AnyBalance.isAvailable('bonus_scale')){
//		tmp=/Ваша бонусная шкала:.*?\n.*?blk\"><b>(.*?<\/b>.*?<b>.*?<\/b>.*?)<\/div>/m.exec(html)[1];
//		tmp=tmp.replace(/<.?b>/g,'');
//		result.bonus_scale=tmp;
//		result.__tariff=result.bonus_scale
//		AnyBalance.trace(result.bonus_scale);
//	}


	
//Баланс бонусов
        if(AnyBalance.isAvailable('balance_all')){
		html=html.replace(/\n/,"");
		tmp=/bonusrurs[\s\S]*/.exec(html);
                result.balance_all='';
		var regexp=/<div class=\"digits\">(\d*)/g;	
		while ((res = regexp.exec(tmp)) != null){result.balance_all += res[1];}
		AnyBalance.trace(result.balance_all);
	}

//Баланс бонусных рублей
        if(AnyBalance.isAvailable('balance')){
		html=html.replace(/\n/,"");
		tmp=/bonusdscnt[\s\S]*/.exec(html);
		result.balance='';
		var regexp=/<div class=\"digits\">\s*(\d*)/g;	
		while ((res = regexp.exec(tmp)) != null){result.balance += res[1];}
		AnyBalance.trace(result.balance);
	}

//Даты сгорания бонусных рублей
	if(AnyBalance.isAvailable('burn_date')){
		tmp=/Баланс бонусных рублей.*\n((.*\n)*).*?<tr class=\"balance_summ\">/m.exec(html)[1];
		var i=0;
		var d={};
		regexp = /<td>.*?<\/td><td>(.*?)<\/td>/g;
		while ((res = regexp.exec(tmp)) != null){
			d[i] = res[1][6]+res[1][7]+res[1][8]+res[1][9]+res[1][3]+res[1][4]+res[1][0]+res[1][1];
			i+=1;
		}
		//Сортировка дат по возрастанию
		for (var j=0;j<i;j++){
			for (var k=0;k<i;k++){
				if (d[k]>d[j]){
					var c=d[k];
					d[k]=d[j];
					d[j]=c;
				}
			}
		}
		AnyBalance.trace(d[0]);
		for (var j=0;j<i;j++){
			d[j]=format_date(d[j],prefs.format_date)
		}
		result.burn_date=d[0];
	}	

// Стратегия
        if(AnyBalance.isAvailable('strategy')){
		url='http://www.mvideo-bonus.ru/personal/edit/strategy/';
		html = AnyBalance.requestGet(url, header);
		var s=0
		for (var j=1;j<5;j++){
			var tmp=/MVStrategy\">\r\n(.*)\r\n(.*)\r\n(.*)\r\n(.*)\r\n(.*)<\/select>/m.exec(html)[j];
			if(/select/.exec(tmp)){s=j;}
		}
		var strategy=['500 бонусных рублей','2х500 бонусных рублей','3х500 бонусных рублей','4х500 бонусных рублей'];
		AnyBalance.trace(strategy[s-1]);
		result.__tariff=strategy[s-1];
		result.strategy=strategy[s-1];
	}
// Дата последней операции по счету
        if(AnyBalance.isAvailable('last_date')){
		url='http://www.mvideo-bonus.ru/personal/detail/';
		html = AnyBalance.requestGet(url, header);
		tmp=/<td class=\"tdl\">(.*)<\/td>/.exec(html)[1];
		tmp = tmp[6]+tmp[7]+tmp[8]+tmp[9]+tmp[3]+tmp[4]+tmp[0]+tmp[1];
		result.last_date=format_date(tmp,prefs.format_date);

	}




	AnyBalance.trace('End parsing!');
	

	AnyBalance.setResult(result);
}
