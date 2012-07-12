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
        if(AnyBalance.isAvailable('bonus_scale')){
		tmp=/Ваша бонусная шкала:.*?\n.*?blk\"><b>(.*?<\/b>.*?<b>.*?<\/b>.*?)<\/div>/m.exec(html)[1];
		tmp=tmp.replace(/<.?b>/g,'');
		result.bonus_scale=tmp;
		result.__tariff=result.bonus_scale
		AnyBalance.trace(result.bonus_scale);
	}
	
//Баланс бонусов
        if(AnyBalance.isAvailable('balance_bonus')){
		html=html.replace(/\n/,"");
		tmp=/Баланс[\s\S]*бонусов/.exec(html);
                result.balance_bonus='';
		var regexp=/<i class=\"n(.)\">/g;	
		while ((res = regexp.exec(tmp)) != null){result.balance_bonus += res[1];}
		AnyBalance.trace(result.balance_bonus);
	}

//Баланс бонусных рублей
        if(AnyBalance.isAvailable('balance')){

		tmp=/bonusrurs[\s\S]*dots/.exec(html);
		result.balance='';
		while ((res = regexp.exec(tmp)) != null){result.balance += res[1];}
		AnyBalance.trace(result.balance);
	}

//Даты сгорания бонусных рублей
	if(AnyBalance.isAvailable('burn_date')){
		tmp=/Баланс бонусных рублей.*\n((.*\n)*).*?<div class=\"balance_summ\">/m.exec(html)[1];
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
	//Наводим красату
		var m;
		for (var j=0;j<i;j++){
			if(d[j][4]+d[j][5]=="01"){m="янв";}
			if(d[j][4]+d[j][5]=="02"){m="фев";}
			if(d[j][4]+d[j][5]=="03"){m="мар";}
			if(d[j][4]+d[j][5]=="04"){m="апр";}
			if(d[j][4]+d[j][5]=="05"){m="май";}
			if(d[j][4]+d[j][5]=="06"){m="июн";}
			if(d[j][4]+d[j][5]=="07"){m="июл";}
			if(d[j][4]+d[j][5]=="08"){m="авг";}
			if(d[j][4]+d[j][5]=="09"){m="сен";}
			if(d[j][4]+d[j][5]=="10"){m="окт";}
			if(d[j][4]+d[j][5]=="11"){m="ноя";}
			if(d[j][4]+d[j][5]=="12"){m="дек";}
//			d[j]=d[j][0]+d[j][1]+d[j][2]+d[j][3]+' '+m+' '+d[j][6]+d[j][7];              //          YYYY MMM DD
			d[j]=d[j][6]+d[j][7]+' '+m+' '+d[j][0]+d[j][1]+d[j][2]+d[j][3];              //          DD MMM YYYY
//			d[j]=d[j][0]+d[j][1]+d[j][2]+d[j][3]+'-'+d[j][4]+d[j][5]+'-'+d[j][6]+d[j][7];//          YYYY-MM-DD
//			d[j]=d[j][6]+d[j][7]+'-'+d[j][4]+d[j][5]+'-'+d[j][0]+d[j][1]+d[j][2]+d[j][3];//          DD-MM-YYYY


		}
		result.burn_date=d[0];
	}


	AnyBalance.trace('End parsing!');
	

	AnyBalance.setResult(result);
}
