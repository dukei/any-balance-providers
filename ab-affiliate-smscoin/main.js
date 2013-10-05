/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статистика заработка на smscoin.com.
Провайдер получает эти данные с помощью API, который предлагает система smscoin. Для работы требуется указать в настройках ID и хэш доступа, а также включить галочку "Разрешить доступ" в профиле.

Сайт партнерки: http://smscoin.ru/
Адрес профиля: https://smscoin.com/ru/account/edit/
*/

function setCounterValue(result,html,counter,field) {
	var r=new RegExp(field+'="(.+?)"');
    var matches=r.exec(html);
	if(matches!=null) {
		result[counter]=matches[1];
	}
}

function fillBlock(block,result,html,regexp) {
	var r=new RegExp(regexp);
    var matches=r.exec(html);
	if(matches==null) {
		result[block+'_count']=0;
		result[block+'_amount']=0;
		result[block+'_profit']=0;
	} else {
		setCounterValue(result,matches[0],block+'_count','sms_count');
		setCounterValue(result,matches[0],block+'_amount','usd_amount');
		setCounterValue(result,matches[0],block+'_profit','usd_profit');
	}
}

function main() {
    var prefs=AnyBalance.getPreferences();
    
    var date=new Date();

	var html=AnyBalance.requestGet('http://ext.smscoin.com/stats/user/?remote_id='+prefs.id+'&remote_hash='+encodeURIComponent(prefs.hash)+'&date_from=1-'+(date.getMonth()+1)+'-'+date.getFullYear()+'&date_to=32-'+(date.getMonth()+1)+'-'+date.getFullYear());

    var result={
        success: true
    };
    
    if(html=='ku') throw new AnyBalance.Error('Нет доступа! Вам нужно включить галочку "Разрешить доступ" в профиле.');
    
    fillBlock('month',result,html,'<summary.+?/>');
    
    fillBlock('today',result,html,'<slab\\s+period="'+date.getFullYear()+'-0?'+(date.getMonth()+1)+'-0?'+date.getDate()+'".+?/>');
    
    date.setDate(date.getDate()-1);
    fillBlock('yesterday',result,html,'<slab\\s+period="'+date.getFullYear()+'-0?'+(date.getMonth()+1)+'-0?'+date.getDate()+'".+?/>');
    
    AnyBalance.setResult(result);
}
